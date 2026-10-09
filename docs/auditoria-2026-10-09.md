# Auditoria do Cortaí — 09/10/2026

Revisão somente leitura do projeto no Lovable (commit `7ed1c6a7`) e da estrutura do banco de produção. Nada foi alterado no código, no banco ou na publicação.

## Escopo e cobertura

O projeto tem cerca de 600 arquivos: código em `src/`, cerca de 150 migrações Supabase e 27 migrações Drizzle. A auditoria foi feita em duas partes e se concentrou na **superfície de risco**: o que é público, o que recebe dados de fora, o que usa a chave de serviço (que ignora o RLS), o que mexe com dinheiro e as regras de acesso do banco.

**Parte 1 — código (cerca de 45 arquivos):**
- `.env`, `package.json`, `roadmap.md`, `.lovable/plan.md`, `docs/seguranca-e-testes.md`
- `AGENTS.md` da raiz, de `src/lib`, `src/lib/brain` e `src/lib/whatsapp`
- Todos os webhooks e rotas `api/public` principais: WhatsApp Meta, Evolution, eventos e automações; Asaas; push; `ai/$`; `cortai/acoes`; `/mcp`
- Funções públicas: `agendamento-publico`, `publico`, `fila-publica`, `fila-ofertas`, `avaliacoes-publicas`, `comanda-ticket`, `brain/secretaria-publica`
- Cérebro CortAI: `agente.server`, `acoes.server`, `uso.server`, `assistente.functions`, `ia/acoes.server`, `ia/ponte.server`
- Autorização: `auth-middleware`, `cron-auth`, `tenant.ts`, `guarda.ts`, `sessao.functions`, `webhook-guard.server`, `segredo-webhook`
- Cobrança e admin: `cobranca.server`, `admin.functions`
- WhatsApp: `whatsapp/fluxo.server`
- Testes de banco: `supabase/tests/rbac.sql`

**Parte 2 — banco de produção, só a estrutura (consultas de leitura ao catálogo, sem ler dados de clientes):**
- Políticas RLS de todas as tabelas, com foco nas que permitem escrita.
- Permissões de coluna para `anon` e `authenticated`.
- Funções SQL que o visitante anônimo pode executar.
- Gatilhos e definições de `is_tenant_member`, `permissao_efetiva`, `cancelar_agendamento`, `entrar_na_fila_publica`, as máquinas de estado do agendamento e `recalcular_carteira`.
- Buckets e políticas do Storage.

As conclusões da parte 2 vêm da **leitura das regras**. Nenhuma escrita foi testada no banco de produção.

**Não lido:**
- Telas e componentes
- Motor de disponibilidade (`disponibilidade.ts`)
- O motor interno do WhatsApp (`whatsapp/motor/*`)
- `barbeiro.functions` e a maioria dos outros `*.functions.ts`
- O corpo das demais RPCs, como `criar_agendamento` e `informar_pagamento_pix_cliente`

---

## Resumo

A camada de **servidor** é bem feita:
- Webhooks fecham por padrão e conferem assinatura em tempo constante.
- Há idempotência por entrega.
- O negócio (tenant) sempre vem do servidor.
- Tokens são guardados só como hash.
- Os limites de taxa ficam persistidos no banco.
- A IA nunca confirma ação sozinha.
- As funções de admin conferem o papel em todas as chamadas.
- O visitante anônimo não executa nenhuma função sensível do banco.

O ponto fraco está nas **regras de acesso do banco (RLS) para a equipe**. Várias tabelas aceitam escrita de **qualquer membro ativo**, sem conferir a permissão do papel. Como o navegador fala direto com o Supabase, quem tem login de barbeiro ou recepção consegue, sem passar pelas telas:
- confirmar pagamento;
- mudar saldo de crédito e de fiado;
- mudar preços;
- apagar avaliações.

As permissões existem no sistema (`permissao_efetiva`), mas só as funções do servidor as conferem. As tabelas, em grande parte, não.

Há também uma falha pontual que pode dar **acesso de administrador da plataforma** (achado 1), dependendo da configuração do login.

| # | Severidade | Tema |
|---|---|---|
| 1 | ~~Crítica~~ **Corrigido** em `022e748` | Admin da plataforma concedido por `ilike` no e-mail: `_` e `%` funcionam como curinga |
| 2 | ~~**Alta**~~ **Corrigido** (migração 0027, aplicada em 09/10/2026) | Qualquer membro altera saldo de crédito e fiado de clientes (`movimentos`), inclusive sem autoria |
| 3 | ~~**Alta**~~ **Corrigido** (migração 0027, aplicada em 09/10/2026) | Qualquer membro marca pagamento como confirmado, finaliza, cancela e muda o valor direto em `agendamentos` |
| 4 | **Alta** | CortAI no painel ignora papel e permissões (chave de serviço passa por cima de `cancelar_agendamento`) |
| 5 | **Alta** | `tenantIdDoMembro` ignora o negócio escolhido: com dois negócios, age no errado |
| 6 | ~~Média~~ **Corrigido** (migração 0027, aplicada em 09/10/2026) | Qualquer membro altera serviços, preços, profissionais, horários, produtos e avaliações |
| 7 | ~~Média~~ **Corrigido** em `022e748` | Cupom aceita curinga (`%`, `_`) no código digitado |
| 8 | Média | Limite por visitante da secretária do site é burlável e permite esgotar a cota do negócio |
| 9 | Média | Entrada pública na fila de chegada sem limite de taxa (confirmado também no SQL) |
| 10 | Baixa | Dois sistemas de migração e 63 casts `as never` desnecessários |
| 10b | Média | Avisos apontam para `/painel`, rota que não existe (página não encontrada) |
| 11 | Média | Agendamento público com telefone de outra pessoa |
| 12 | Baixa | Visitante anônimo lê a comissão dos serviços e o `user_id` dos profissionais de todos os negócios |
| 13 | Baixa | Remarcação pela IA: o plano B recria o horário como agendamento novo |
| 14 | Baixa | Painel admin conta linhas trazendo tudo: passa do teto de 1000 linhas e mostra números errados |
| 15 | Baixa | Pequenos pontos (contadores não atômicos, JSON sem try, consultas sem limite, legado ALVO IA, buckets sem tipo de arquivo) |
| 16 | Média | Criação de negócios sem login: o único freio (5 rascunhos por hora) usa o IP vindo de `x-forwarded-for`, que o visitante forja |

---

## Achados

### 1. Crítica (condicional) — Admin da plataforma por curinga no e-mail

> **Corrigido em 09/10/2026 (`022e748`).** O e-mail agora é comparado de forma exata, sem diferenciar maiúsculas (`mesmoEmail` em `src/lib/comparacao-exata.ts`). Conferido no banco: a única conta admin tem e-mail autorizado exato, ou seja, nenhum acesso indevido ocorreu por esse caminho.

**Onde:** `src/lib/sessao.functions.ts`, função `garantirPerfil`.

**O que acontece:** a cada entrada, a função faz:

```ts
db.from("emails_admin_autorizados").select("email").ilike("email", email)
```

Se encontrar, dá o papel `admin` à conta. O e-mail **de quem está entrando** vira o **padrão** do `ilike`. Nele, `_` vale por qualquer caractere e `%` por qualquer sequência.

**Exemplos:**
- Se o e-mail autorizado é `dono.cortai@dominio.com`, uma conta `dono_cortai@dominio.com` também passa.
- Uma conta cujo endereço tenha `%` no começo (o `%` é permitido antes do `@` pelo padrão de e-mail) casaria com qualquer administrador do mesmo domínio.

**Quando é explorável:**
- Se o cadastro por e-mail **não exige confirmação**, basta criar a conta com esse endereço.
- Se exige, o atacante precisa receber e-mail no endereço parecido. Isso é difícil em provedores grandes, mas possível em domínio próprio.

Vale conferir no painel do Supabase se "Confirm email" está ligado. Mesmo ligado, a correção é obrigatória.

**Efeito:** acesso total de dono da plataforma. Isso inclui a chave do Asaas, ativar e desativar negócios, **excluir negócio permanentemente**, preços e recursos de plano.

**Correção (uma linha):** comparar por igualdade sem diferenciar maiúsculas. Por exemplo, `.eq("email", email.toLowerCase())`, com os e-mails autorizados gravados em minúsculas. Outra opção é uma RPC que faça `lower(email) = lower(_email)`. Também vale revisar as contas que hoje têm papel `admin` em `user_roles`.

### 2. Alta — Qualquer membro altera saldo de crédito e fiado

> **Corrigido em 09/10/2026 (migração `0027_equipe_escreve_com_permissao`, aplicada no banco de produção).** Escrita direta só com a permissão do papel (`tem_alguma_permissao`); `movimentos` sem INSERT direto; gatilho `trg_agendamento_proteger_colunas_sensiveis` em `agendamentos`; equipe só lê `avaliacoes`. Verificado no banco real: `tests/sql/rbac-escrita-equipe.sql` passou de 35 brechas para 76 de 76 OK; o `supabase/tests/rbac.sql` ficou igual (a única falha, "dono trocar plano", é antiga e é do teste).

**Onde:** RLS da tabela `movimentos`.

**O que acontece:**
- A política de INSERT só exige `carteira_pertence_ao_membro(carteira_id)`, que equivale a ser membro ativo do negócio, e aceita `criado_por` igual a **NULL** ou ao próprio usuário.
- Não há conferência de permissão: nem `liberar_fiado`, nem `confirmar_pagamento`.
- O gatilho `recalcular_carteira` soma todos os movimentos e grava o saldo.

**Efeito:** um barbeiro ou alguém da recepção pode, direto pela API do Supabase com o próprio login, lançar movimentos com qualquer valor na carteira de qualquer cliente do negócio:
- dar créditos de pacote;
- zerar dívida de fiado;
- mexer no progresso de fidelidade.

Com `criado_por = NULL`, o lançamento **fica sem autoria**. A tabela é só de inclusão (bom para auditoria), mas o autor some.

**Correção:**
- Tirar o INSERT direto do papel `authenticated` e fazer os lançamentos só por RPCs que conferem `permissao_efetiva` e gravam `criado_por = auth.uid()`.
- No mínimo, exigir a permissão na política e proibir `criado_por` nulo.

### 3. Alta — Pagamento confirmado e mudanças de status direto em `agendamentos`

> **Corrigido em 09/10/2026 (migração `0027_equipe_escreve_com_permissao`, aplicada no banco de produção).** Escrita direta só com a permissão do papel (`tem_alguma_permissao`); `movimentos` sem INSERT direto; gatilho `trg_agendamento_proteger_colunas_sensiveis` em `agendamentos`; equipe só lê `avaliacoes`. Verificado no banco real: `tests/sql/rbac-escrita-equipe.sql` passou de 35 brechas para 76 de 76 OK; o `supabase/tests/rbac.sql` ficou igual (a única falha, "dono trocar plano", é antiga e é do teste).

**Onde:** RLS de `agendamentos` e os gatilhos de estado.

**O que acontece:**
- A política `tenant gerencia agendamentos` (ALL) só exige `is_tenant_member`.
- No `with_check`, ela só impede gravar `pagamento_confirmado_por` com o id de **outra** pessoa.
- O papel `authenticated` tem UPDATE em todas as colunas, inclusive `pagamento_confirmado_em`, `valor_centavos` e `status`.
- O gatilho `agendamento_validar_transicao` aceita `na_cadeira → finalizado` quando `pagamento_confirmado_em` está preenchido.
- A RPC `cancelar_agendamento` exige a permissão `cancelar_agendamento`, mas o UPDATE direto não passa por ela.

**Efeito:** qualquer membro ativo, incluindo o barbeiro sem a permissão `confirmar_pagamento`, consegue:
- **marcar um atendimento como pago e finalizado** sem pagamento real. Isso contraria a regra "nunca inventar confirmação de pagamento";
- cancelar atendimentos de colegas **sem a devolução de crédito e fiado** que a RPC faz;
- alterar o `valor_centavos`.

**Correção:**
- Revogar o UPDATE das colunas sensíveis (`pagamento_confirmado_em`, `pagamento_confirmado_por`, `valor_centavos`, `status`) para `authenticated`. As mudanças passam a ser feitas pelas RPCs oficiais, que conferem `permissao_efetiva`.
- Ou: um gatilho que recusa a mudança dessas colunas quando a chamada não é do servidor e a pessoa não tem a permissão.

Antes, confirmar quais telas gravam direto na tabela, para não quebrar fluxos que funcionam.

### 4. Alta — CortAI no painel ignora papel e permissões

**Onde:**
- `src/lib/assistente.functions.ts` (`perguntarAoCortai`)
- `src/lib/brain/acoes.server.ts` (`acaoPermitida`)
- `src/lib/ia/acoes.server.ts`

**O que acontece:**
- `perguntarAoCortai` só exige vínculo com o negócio. Ela chama o cérebro **sem `papel` nem `profissionalId`** e sem `exigirPermissao`.
- Em `acaoPermitida`, a regra por papel só vale para o WhatsApp.
- As ações gravam com `supabaseAdmin`. Para o banco, isso é "chamada do servidor" (`chamada_do_servidor()`), e a RPC `cancelar_agendamento` **pula a conferência da permissão**.

**Efeito:**
- Qualquer membro cancela ou remarca atendimentos de colegas pelo chat, mesmo sem a permissão `cancelar_agendamento`.
- O profissional vê os indicadores do dia (`consultar_movimento`), o que contraria `src/lib/brain/AGENTS.md`.

**Correção:**
- Passar `papel` e `profissionalId` do vínculo no `ctx` do painel.
- Aplicar no painel a mesma regra da equipe no WhatsApp.
- Conferir `permissao_efetiva` antes de executar a pendente.

### 5. Alta — `tenantIdDoMembro` ignora o negócio escolhido

**Onde:** `src/lib/tenant.ts`. O mesmo padrão aparece em `src/lib/mcp/supabase.ts`.

**O que acontece:** a função faz `tenant_usuarios … .limit(1)` sem ordenar e sem considerar `perfis.tenant_ativo`. Já `getSessao` usa `tenant_ativo`.

**Efeito:** uma conta ligada a dois negócios pode ver o negócio A na tela enquanto as funções do servidor gravam no negócio B.

**Ponto resolvido na parte 2:** o RLS de `tenant_usuarios` só mostra linhas a membros **ativos** (`is_tenant_member` confere `ativo`). Por isso, um membro suspenso não passa por essa função.

**Correção:** um resolvedor único de vínculo (ativo, preferindo `tenant_ativo`), usado por `getSessao`, `tenantIdDoMembro` e o MCP.

### 6. Média — Catálogo, horários e avaliações alteráveis por qualquer membro

> **Corrigido em 09/10/2026 (migração `0027_equipe_escreve_com_permissao`, aplicada no banco de produção).** Escrita direta só com a permissão do papel (`tem_alguma_permissao`); `movimentos` sem INSERT direto; gatilho `trg_agendamento_proteger_colunas_sensiveis` em `agendamentos`; equipe só lê `avaliacoes`. Verificado no banco real: `tests/sql/rbac-escrita-equipe.sql` passou de 35 brechas para 76 de 76 OK; o `supabase/tests/rbac.sql` ficou igual (a única falha, "dono trocar plano", é antiga e é do teste).

**Onde:** RLS de `servicos`, `profissionais`, `horarios_de_funcionamento`, `produtos`, `escalas_de_profissional`, `bloqueios_de_agenda`, `avaliacoes`, `indicacoes`, `fila_de_espera`, `preferencias_do_cliente_avisos` e `onboarding_do_tenant`. Todas usam só `is_tenant_member`.

**O que acontece:** o sistema tem a permissão `alterar_dados_barbearia`, conferida por exemplo em `confirmarAcaoDaIa`, mas as tabelas não a exigem.

**Efeito:** um barbeiro pode, pela API, mudar **preço de serviço** (a comanda usa o preço do catálogo), desativar colegas e mexer no horário de funcionamento. Também pode **apagar ou alterar avaliações**, o que muda a média exibida na página pública.

**Correção:** exigir a permissão correspondente nas políticas de escrita, por exemplo `has_tenant_permission(tenant_id, 'alterar_dados_barbearia')`. Para `avaliacoes`, deixar só leitura para a equipe; a gravação já é feita pela RPC pública.

### 7. Média — Cupom aceita curinga

> **Corrigido em 09/10/2026 (`022e748`).** O código só aceita letras, números e hífen (`codigoDeCupomValido`), tanto ao usar o cupom (`cobranca.server.ts`, `aplicarCupom`) quanto ao cadastrá-lo no admin (`salvarCupom`).

**Onde:** `src/lib/cobranca.server.ts`, função `cupomPorCodigo`.

**O que acontece:** a busca usa `.ilike("codigo", codigo.trim())` com o texto digitado. Dá para descobrir e aplicar cupons não divulgados, letra por letra. É o mesmo tipo de falha do achado 1.

**Correção:** igualdade sem diferenciar maiúsculas, ou escapar `%`, `_` e `\` antes do `ilike`.

### 8. Média — Secretária do site: limite por visitante burlável

**Onde:** `src/lib/brain/secretaria-publica.functions.ts`.

**O que acontece:** o identificador do visitante usa o **primeiro** valor de `x-forwarded-for`, que o cliente pode forjar. O `webhook-guard` faz certo: usa `cf-connecting-ip` ou o último valor da cadeia.

**Efeito:** um único atacante escapa do limite de 15 por hora, esgota a cota diária de 300 turnos do negócio (a IA do site sai do ar) e gera custo no gateway.

**Correção:** usar `ipDaChamada()` e somar um limite por IP com `consumirLimite`.

### 9. Média — Fila de chegada pública sem limite de taxa

**Onde:** `entrarNaFilaPublica` e a RPC `entrar_na_fila_publica`.

**O que acontece:** nem a função do servidor nem a RPC têm limite. A RPC cria uma ficha de cliente para cada telefone novo.

**Efeito:** dá para encher a fila e o cadastro de clientes de um negócio com dados falsos.

**Ponto positivo:** o visitante anônimo não executa a RPC direto; só pelo servidor.

**Correção:** aplicar `limitarPublico` (por IP e por telefone), como no agendamento.

### 10. Baixa — Dois sistemas de migração e casts desnecessários

**O que acontece:**
- `supabase/migrations/` vai até 01/10/2026. Depois disso as mudanças de banco ficam em `drizzle/migrations/` (0000 a 0026).
- Há 63 `as never` em chamadas ao banco. **Correção feita depois, com o código completo:** `types.ts` está atualizado e já inclui `chaves_internas`, `garantir_comanda`, `informar_pagamento_pix_cliente` e as demais. Os casts são sobras e só desligam a checagem de tipos nesses pontos.

**Correção:** remover os casts aos poucos e documentar no `AGENTS.md` qual pasta de migração é a oficial.

### 10b. Média — Avisos apontam para `/painel`, que não existe

**Onde:**
- `src/lib/whatsapp/fluxo.server.ts`: aviso "Cliente pediu atendimento", com `_link: "/painel"`.
- `src/lib/push/aviso-sininho.server.ts`: link padrão do push, `n.link || "/painel"`.

**O que acontece:** não existe rota `/painel` em `src/routes`; a área do negócio está toda em `/barbeiro`. Tocar nesses avisos leva à página "não encontrada". O Knowledge do Lovable diz que a área oficial é `/painel` e que `/barbeiro` só redireciona, mas o código atual é o contrário.

**Correção:** usar `LINKS_DE_TELA` (`src/lib/links-de-tela.ts`) nesses dois pontos, ou criar a rota `/painel` redirecionando para `/barbeiro`. Também é preciso decidir qual dos dois endereços é o oficial e alinhar o Knowledge.

### 11. Média — Agendamento público com telefone de terceiros

**Onde:** `agendarComoConvidado`.

**O que acontece:** qualquer pessoa marca horário com o WhatsApp de outra. A ficha existente é reaproveitada e a vítima recebe a confirmação. Os limites atuais reduzem o abuso, mas não impedem.

**Opções:** código de confirmação no WhatsApp antes de reaproveitar a ficha, ou criar o horário como "aguardando confirmação". Pede decisão de produto.

### 12. Baixa — Dados internos legíveis por visitante anônimo

**Onde:** permissões de coluna do papel `anon`.

**O que acontece:**
- Em `servicos`, o anônimo lê `comissao_percentual`.
- Em `profissionais`, lê `user_id`.

Ambos valem para todos os negócios ativos, pela API pública do Supabase. As telas não precisam disso.

**Correção:** revogar o SELECT dessas colunas para `anon` (`REVOKE SELECT (comissao_percentual) ON servicos FROM anon` etc.). As funções do servidor usam a chave de serviço e não são afetadas.

### 13. Baixa — Remarcação pela IA recria o original como novo

**Onde:** `src/lib/ia/acoes.server.ts`, função `remarcarAgendamento`.

**O que acontece:** se o novo horário falha depois do cancelamento, o plano B cria um agendamento novo no horário original. O registro novo tem outro id e perde a comanda, as preferências, o token e a origem.

**Sugestão:** reabrir o original, em vez de recriar.

### 14. Baixa — Painel admin com números errados acima de 1000 linhas

**Onde:** `getAdminTenants`, `getSuggestions` e `getAdminOverview` em `admin.functions.ts`.

**O que acontece:** a contagem de agendamentos por negócio é feita trazendo **todas** as linhas (`select("tenant_id")`) e contando no servidor. O Supabase devolve no máximo 1000 linhas por consulta (padrão), então, passado esse volume, as contagens ficam erradas sem nenhum aviso.

**Correção:** contar no banco (`count` agrupado por `tenant_id`, por uma view ou RPC).

### 15. Baixa — Pontos menores

- **Contador de cupom:** `cupons.usos` faz leitura + 1 + gravação; com concorrência, subconta.
- **`/api/public/whatsapp/eventos`:** faz `JSON.parse` sem `try` e devolve 500 em vez de 400. Só afeta quem tem o segredo.
- **`getPaginaPublica`:** lê todas as notas para calcular a média; vai pesar com o volume.
- **`conversas_whatsapp.nao_lidas`:** leitura + 1 + gravação; com mensagens simultâneas, o contador perde.
- **Legado ALVO IA ainda exposto:** `/api/public/ai/*`, `/api/public/cortai/acoes` e `/api/public/alvo-ia` aceitam tokens ativos. Suspender ou desligar com autorização (fase 5 do plano da CortAI).
- **`confirmar_agendamento` (API legada):** grava o `status` direto em vez de usar a RPC.
- **Buckets do Storage:** não têm `allowed_mime_types`, então só o limite de tamanho protege. O envio é só do dono, mas um tipo como SVG passa.

### 16. Média — Criação de negócios sem login com freio forjável

**Onde:** `src/lib/rascunho.functions.ts` (`origem()`, `freioDeAbuso`, `criarRascunhoDeBarbearia`, `salvarRascunhoDeBarbearia`, `publicarRascunhoDeBarbearia`).

**O que acontece:**
- Montar e **publicar** um negócio novo pelo link `/configurar-minha-barbearia` não exige login. As três funções não usam `requireSupabaseAuth`.
- O único freio é `freioDeAbuso`: no máximo 5 rascunhos por hora por `origem_ip`.
- `origem()` lê `x-forwarded-for` **antes** de `cf-connecting-ip` e pega o primeiro valor, que o visitante escreve à vontade. Trocar o cabeçalho a cada chamada zera o limite.
- A pesquisa de 09/10/2026 achou o mesmo padrão em `brain/secretaria-publica.functions.ts` (achado 8). Em `api/public/funil.ts` o cabeçalho confiável (`cf-connecting-ip`) vem primeiro, então só o fallback é frágil, e o contador é em memória (não vale entre instâncias).

**Efeito:** dá para criar rascunhos e negócios sem limite: lixo no banco, endereços (slugs) ocupados e custo de armazenamento. Não confirmei se a publicação tem outro freio no banco.

**Correção:** usar `ipDaChamada()` do `webhook-guard.server.ts` e `consumirLimite` (contador no banco) em criar, salvar e publicar; considerar um limite também por negócio publicado por IP por dia.

---

## O que está bem feito

- **Webhooks:**
  - Meta: HMAC com `timingSafeEqual`.
  - Evolution: segredo só por cabeçalho; sem segredo configurado, responde 503.
  - Asaas: token em tempo constante.
  - Push e varredura: chave interna de pelo menos 32 caracteres.
- **Idempotência:** caixa de entrada durável (`whatsapp_webhook_events`, `eventos_asaas`), dedupe de mensagem por id externo e índices únicos.
- **Isolamento por negócio:** o tenant vem sempre da conexão, da sessão ou do token. As ações de domínio filtram `tenant_id`. `is_tenant_member` confere `ativo`.
- **Anônimo restrito:** não executa nenhuma função sensível do banco; só lê serviços, profissionais, horários e parceiros ativos.
- **Admin:** toda função de `admin.functions` confere `has_role(admin)` no servidor. A chave do Asaas nunca vai ao navegador.
- **Dados financeiros:**
  - `pagamentos` e `movimentos` são só de inclusão, por gatilho.
  - `comandas` e `pagamentos` não têm escrita direta pela equipe.
  - Os saldos da carteira são protegidos por gatilho.
  - O limite de fiado do cliente é protegido.
  - O teto de permissões por papel (`tenant_usuarios_limitar_permissoes`) existe.
- **Tokens:** a API e o ticket público guardam só o SHA-256; o UUID sozinho não basta.
- **Limite de taxa:** contadores no banco (funciona com várias instâncias) e IP lido corretamente no `webhook-guard`.
- **IA segura por desenho:** escrita só depois de confirmação, "agendado/cancelado" escrito pela IA é bloqueado, não existe ação de pagamento e há pausa automática por falta de crédito.
- **WhatsApp:**
  - A equipe só é reconhecida por telefone verificado.
  - Número solto nunca vai para a IA.
  - Fora da janela de 24h, só sai modelo aprovado.
  - Uma falha de envio nunca trava a operação.
- **Storage:** os buckets são privados e o envio de logos é só do dono.
- **Segredos:** o `.env` só tem chaves públicas.
- **Testes:** dezenas de `*.test.ts` e testes SQL de RBAC e comanda.

## Pendências abertas no roadmap (resumo)

- **Validação visual autenticada em 390px/1280px:** bloqueada por falta de sessão de teste do negócio.
- **Chat público conversacional, fase 1:** não iniciado.
- **Agenda:** visão "Todos" compacta, visão individual e bloqueios como faixa na timeline.
- **Etapa 6:** perfil do cliente e revisão de textos. Falta decidir sobre o e-mail na ficha.
- **Secretária completa no WhatsApp:** depende do número da Meta ativo.
- **Avisos:** push para todo aviso do sininho e aviso novo a cada remarcação.
- **Central de Notificações:** aguardando autorização para publicar.
- **CortAI:** as 5 fases do plano atual.

## Ordem sugerida de correção

1. **Achado 1, hoje:** troca de `ilike` por igualdade e revisão de quem tem papel `admin`.
2. **Achados 2, 3 e 6, juntos:** as políticas RLS de escrita passam a exigir `permissao_efetiva`, e as colunas sensíveis só mudam via RPC. Ampliar `supabase/tests/rbac.sql` para cobrir `movimentos`, o UPDATE de `agendamentos` e as escritas em `servicos` e `avaliacoes`, por papel. Aplicar em migração só de acréscimo (políticas e grants), sem DROP de dados.
3. **Achados 4 e 5:** resolvedor único de vínculo com o papel e a regra por papel no painel da CortAI.
4. **Achados 7, 8 e 9:** correções curtas de uma linha ou uma função cada.
5. **Achados 10b, 10 e 12:** corrigir os links `/painel`, remover os casts e revogar as colunas expostas ao anônimo.
6. **Achado 11:** decisão de produto.
7. **Achados 8 e 16:** trocar a origem do visitante por `ipDaChamada()` (junto, porque é a mesma correção).
