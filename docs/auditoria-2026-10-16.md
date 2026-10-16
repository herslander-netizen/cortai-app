# Auditoria do Cortaí — 16/10/2026 (antes dos testes da prévia)

Revisão **somente leitura**. Nada foi corrigido nesta auditoria.

## Alvo

- **Código:** branch `cloudflare-workers-migration-2026-10-13`, commit `c69f369`.
- **Banco:** `cortai-prod` (`ibsberidejlbczxrweqg`), montado em 16/10 pela automação "Montar banco novo". As 172 migrações entraram numa transação só.
- **Hospedagem:** Worker de prévia `cortai-reconstruction-test-2026` na Cloudflare.

O banco original do Lovable não foi consultado: ele não responde (504) e está fora do escopo da migração.

## Cobertura

**Lido no banco** (só o catálogo; de dados, apenas contagens):
- políticas RLS;
- permissões de tabela e de coluna para `anon` e `authenticated`;
- funções `SECURITY DEFINER` e o corpo das que mexem em equipe e agendamento;
- gatilhos de proteção;
- buckets do Storage;
- tarefas do `pg_cron`;
- alertas de segurança do Supabase (advisors).

**Lido no código** (busca dirigida):
- `.ilike`/`.like`;
- funções do servidor sem `requireSupabaseAuth` e seus limites;
- rotas `api/public/**` (segredo, tempo constante, guarda);
- origem do IP;
- segredos no repositório;
- ações de pagamento na IA;
- escrita de status e pagamento;
- links para `/painel`;
- domínio `cortai.dev` fixo no código.

**Não lido ou não exercitado:**
- telas;
- o corpo de todas as 102 funções do banco;
- o motor do WhatsApp;
- as configurações de **Auth** do Supabase (Site URL, "Confirm email", provedores), que as ferramentas daqui não alcançam.

**Nada foi testado na prática.** As conclusões vêm da leitura das regras. O teste de permissões `supabase/tests/rbac.sql` rodou no banco novo durante a montagem e passou em **68 de 68**. É a única evidência executada.

---

## Resumo

| # | Severidade | Tema | Estado |
|---|---|---|---|
| N1 | **Alta (operacional)** | Credenciais do `cortai-prod` coladas no chat da sessão de migração | **Aberto** |
| N2 | Média | `venda_itens` aceita escrita de qualquer membro do negócio | **Aberto** |
| N3 | Média | Domínio `cortai.dev` fixo no código: na prévia, links e imagens apontam para a produção antiga | **Aberto** (só pesa na prévia; some na virada de domínio) |
| N4 | Média | `enviarPedidoDeProjeto` (formulário público) sem limite de tentativas | **Aberto** |
| N5 | Média (operacional) | `bun.lock` baixa 634 pacotes do cache privado do Lovable | **Aberto** (troca testada, mas bloqueada pelo controle desta sessão) |
| N6 | Baixa | `convidar_membro` revela se um e-mail tem conta antes de conferir a permissão | **Aberto** |
| N7 | Baixa | Banco novo tem 1 negócio de demonstração ("Barbearia Cortaí — Demonstração") com 8 clientes fictícios | **Aberto** |
| N8 | Baixa | Segredo `PREVIEW_SUPABASE_PUBLISHABLE_KEY` inválido no GitHub (hoje não é mais usado) | **Aberto** (limpeza) |
| N9 | Info | `TRUNCATE` concedido a `anon`/`authenticated` (padrão do Supabase; a API REST não expõe) | Aceito |

### Achados da auditoria de 09/10, conferidos no banco novo e no código desta branch

| # | Tema | Estado em 16/10 |
|---|---|---|
| 1 | Admin por curinga no e-mail | **Corrigido**: `mesmoEmail` em `sessao.functions.ts`; `emails_admin_autorizados` e `user_roles` só têm política de leitura |
| 2 | Membro altera saldo de crédito/fiado (`movimentos`) | **Corrigido**: sem `INSERT` para `authenticated` e nenhuma política de `UPDATE`/`DELETE` em `movimentos`/`pagamentos` |
| 3 | Membro marca pagamento/status/valor em `agendamentos` | **Corrigido**: a política continua só com `is_tenant_member`, mas o gatilho `agendamento_proteger_colunas_sensiveis` barra status, valor e pagamento fora das funções oficiais |
| 4 | CortAI no painel ignora papel | **Corrigido no código** (não exercitado) |
| 5 | `tenantIdDoMembro` ignora o negócio escolhido | **Corrigido no código** (não exercitado) |
| 6 | Membro altera serviços, preços e avaliações | **Corrigido em parte**: continuam só com `is_tenant_member` as tabelas `clientes`, `bloqueios_de_agenda`, `escalas_de_profissional`, `fila_de_espera`, `indicacoes`, `onboarding_do_tenant`, `preferencias_do_cliente_avisos` e `venda_itens` (esta última vira N2). As outras são operação do dia a dia e são coerentes com as permissões padrão de barbeiro e recepção |
| 7 | Cupom com curinga | **Corrigido**: `codigoDeCupomValido` antes do `ilike` (`monetizacao.functions.ts:227`, `cobranca.server.ts:139`) |
| 8 | Secretária do site burlável por IP | **Corrigido**: `ipDaChamada` usa `cf-connecting-ip`, correto na Cloudflare. **Aberto**: o limite extra por IP |
| 9 | Fila de chegada sem limite | **Corrigido no código**: `aplicarLimiteDaFila` em `entrarNaFilaPublica` (não exercitado) |
| 10 | Dois sistemas de migração e casts `as never` | **Aberto**: 74 `as never` hoje (eram 63) |
| 10b | Avisos para `/painel` | **Corrigido**: nenhuma função do banco gera link `/painel`; no código, `/painel` só aparece em listas de prefixos |
| 11 | Agendamento público com telefone de terceiros | **Não reverificado** (fora da leitura dirigida) |
| 12 | Anônimo lê comissão e `user_id` | **Aberto**: `anon` lê `servicos.comissao_percentual` e `profissionais.user_id` (políticas "publico ve … ativos"). Nenhuma outra coluna sensível é visível ao anônimo: as demais tabelas não têm política de leitura para `anon` |
| 13 | Remarcação pela IA recria agendamento | **Não reverificado** |
| 14 | Contagem do admin presa ao teto de 1000 linhas | **Não reverificado** |
| 15 | Buckets sem tipo de arquivo | **Aberto**: `tenant-logos` e `home-publica` são privados, mas sem limite de tipo nem de tamanho |
| 16 | Criação de negócio sem login com IP forjável | **Corrigido**: `ipDaChamada` em `rascunho.functions.ts` |
| 17 | Prazo de cancelamento do dono | **Corrigido no código** (não exercitado) |

---

## Achados novos

### N1. Alta (operacional) — Credenciais do banco novo expostas no chat

**Onde:** na conversa da sessão de migração de 15 e 16/10 apareceram a chave `sb_secret_…` do `cortai-prod` e duas senhas do banco.

**Efeito:** quem tiver acesso a esse histórico tem acesso total ao banco. Hoje o banco tem só dados de demonstração. Depois do primeiro cliente, a exposição vira vazamento.

**Correção:**
- Criar uma chave secreta nova, atualizar `PREVIEW_SUPABASE_SERVICE_ROLE_KEY` e republicar a prévia; depois **apagar a chave antiga**.
- Resetar a senha do banco.
- Revogar o token `sbp_` usado na montagem.

### N2. Média — Itens de venda alteráveis por qualquer membro

**Onde:** política `tenant gerencia itens de venda` (`ALL`, `authenticated`) em `venda_itens`, regra só com `is_tenant_member`.

**O que acontece:** `vendas` já exige `registrar_venda` para incluir, `visualizar_financeiro` para ajustar e `acoes_destrutivas` para apagar. Mas os **itens** de qualquer venda podem ser incluídos, alterados ou apagados por qualquer membro ativo, direto pela API.

**Efeito:** relatório de vendas e comissão de produto ficam manipuláveis por quem não tem permissão financeira.

**Correção:** espelhar as regras de `vendas`, conferindo a permissão pelo `tenant_id` da venda. Não achei gatilho de proteção em `venda_itens`.

### N3. Média — `cortai.dev` fixo no código

**Onde:**
- `src/components/marca/TelaPublicaBarbearia.tsx:33` (links de compartilhar)
- `src/components/marca/editor/SecaoLink.tsx:65`
- `src/lib/previa.ts:16`
- `src/lib/agendamento-publico.functions.ts:635` (imagem social)
- `src/lib/versao.ts:21`
- `src/lib/home-publica.ts:422`

**O que acontece:** na prévia, compartilhar a página do negócio ou abrir a prévia gera link para a **produção antiga**, que ainda roda no Lovable. Já as mensagens de WhatsApp usam `CORTAI_PUBLIC_BASE_URL` e recusam `cortai.dev`, como deve ser.

**Efeito:** teste confuso agora. Na virada de domínio para a Cloudflare, os links passam a funcionar.

**Correção:** ler a origem de uma variável (`CORTAI_PUBLIC_BASE_URL` ou `VITE_…`), mantendo `cortai.dev` como padrão.

### N4. Média — Formulário institucional sem limite

**Onde:** `enviarPedidoDeProjeto` em `src/lib/institucional.functions.ts`. Grava em `pedidos_de_projeto`, sem `limitarPublico`/`barrarAbusivo`.

**Efeito:** spam ilimitado na tabela e no painel admin.

**Correção:** `limitarPublico` por IP (`ipDaChamada`), como em `agendamento-publico`.

### N5. Média (operacional) — Dependências presas ao cache do Lovable

**Onde:** `bun.lock`, com 634 URLs `lovable-core-prod`.

**Efeito:** quando o Lovable cortar o acesso, o CI e a publicação da prévia param de instalar dependências.

**Correção:** trocar o host pelo `registry.npmjs.org`, mantendo versões e hashes. Já foi testado: instalação congelada, 156 de 156 arquivos de teste. Falta só gravar; o controle de permissões desta sessão bloqueou o commit.

### N6. Baixa — Descoberta de contas por `convidar_membro`

**Onde:** a função procura o e-mail em `auth.users` e responde "conta não encontrada" **antes** de chamar `equipe_valida_edicao`.

**Efeito:** qualquer usuário logado descobre se um e-mail tem conta no Cortaí.

**Correção:** validar a permissão primeiro e responder com uma mensagem única.

### N7. Baixa — Negócio de demonstração no banco novo

**Onde:** tenant `0de00000-…0001`, criado pelas migrações de setembro (`20260922040338` e seguintes). Tem 4 profissionais, 6 serviços e 8 clientes fictícios, e o nome usa "Barbearia".

**Efeito:** aparece em buscas públicas, se estiver ativo e listado, e contraria o produto neutro.

**Correção:** decidir se fica para testes. Se não ficar, desativar (`ativo=false`); não apagar.

### N8. Baixa — Segredo inválido sobrando

**Onde:** `PREVIEW_SUPABASE_PUBLISHABLE_KEY` no GitHub. O Supabase recusou o valor (`UNAUTHORIZED_INVALID_API_KEY`). A publicação passou a usar o valor público fixo (`c69f369`).

**Correção:** apagar ou corrigir o segredo, para não confundir.

### N9. Info — `TRUNCATE` para `anon`/`authenticated`

É o padrão de permissões do Supabase. A API REST não oferece `TRUNCATE`, e nenhuma função `SECURITY DEFINER` o executa. Fica registrado para uma limpeza futura de permissões.

## Pontos verificados e em ordem

- **0 tabelas sem RLS.** As 8 tabelas com RLS e sem política são só do servidor: `eventos_funil`, `push_entregas`, `rascunhos_de_barbearia`, `telefones_da_equipe`, `webhook_limites`, `webhook_rejeicoes`, `whatsapp_contexto_numero` e `whatsapp_webhook_events`.
- **Nenhuma função `SECURITY DEFINER` executável por `anon`.** As 24 executáveis por `authenticated` conferem `auth.uid()` e o vínculo, ou são leituras inofensivas (`has_role`, `eh_hoje_na_barbearia`, `recurso_do_tenant_ativo`).
- **Webhooks e rotas internas** conferem segredo em tempo constante (`safeEqual`, `autorizarWebhook`, `x-hub-signature-256`) e fecham quando o segredo falta.
- **As tarefas agendadas** apontam para a prévia, não para `cortai.dev`.
- **Nenhum segredo real no repositório** (`.env.example` só tem nomes).
- **A IA não tem ação de pagamento.** A finalização de atendimento passa por `exigirPermissao("confirmar_pagamento")` no servidor.

## Ordem de correção sugerida

1. **N1:** trocar chave, senha e token antes de qualquer cliente real.
2. **N5:** gravar o `bun.lock` público (precisa de liberação do dono).
3. **N2:** política de `venda_itens`.
4. **N4:** limite no formulário institucional.
5. **N3:** origem configurável para os links (antes de divulgar a prévia).
6. **12 e 15:** colunas sensíveis para o anônimo e limites dos buckets.
7. **N6, N7, N8, 10:** limpezas.

---

## Complemento — segunda leitura (16/10/2026, mais tarde)

Feita em outra sessão, também **somente leitura**:
- **Código:** a `main` (`a709f88`). Os arquivos citados abaixo são iguais nesta branch (conferido).
- **Banco:** o mesmo `cortai-prod`, só o catálogo e contagens.
- **Banco do Lovable:** continuou em 504.
- **Nada foi exercitado:** nenhuma chamada como `anon` ou `authenticated`.

### Correção de uma afirmação acima

Na linha do achado 12, o texto diz que "nenhuma outra coluna sensível é visível ao anônimo". **Não é o caso.** No `cortai-prod`, `anon` e `authenticated` têm privilégio de **tabela inteira** (`SELECT, INSERT, UPDATE, DELETE…`) em `tenants`, `servicos`, `profissionais`, `conexoes_sociais` e outras tabelas.

Os `GRANT SELECT (colunas)` das migrações (`20260912204526_…`, `20260912222429_…` e `drizzle/0008`) não restringem nada porque, exceto em `produtos`, nenhuma faz `REVOKE SELECT` da tabela antes. O RLS ainda escolhe as linhas, mas **todas as colunas** das linhas visíveis ficam abertas.

### N2 (`venda_itens`) — já fechado no banco

Hoje `venda_itens` só tem a política `equipe le itens das vendas visiveis` (SELECT). O N2 acima parece já fechado no banco; vale confirmar qual migração fechou.

### Achados novos desta leitura

| # | Severidade | Tema |
|---|---|---|
| C1 | **Alta** | Tokens OAuth do Instagram/TikTok (`conexoes_sociais.token_acesso`/`token_refresh`) legíveis por qualquer membro |
| C2 | Média | `anon` lê as 54 colunas de `tenants` ativos (hoje são 2) |
| C3 | Média | Callback OAuth com `state` fixo por negócio, sem `nonce`, prazo nem usuário |
| C4 | Média | `pedidos_de_projeto` sem política de INSERT: o formulário público (N4 acima) falha no banco novo |
| C5 | Baixa | Quitação de fiado grava `pagamentos` confirmado em vários passos, sem RPC atômica nem idempotência |
| C6 | Baixa | `has_role(_user_id, …)` aceita qualquer `user_id`; com C2/12 dá para descobrir quem é admin |
| C7 | Baixa | Proteção contra senha vazada desligada no Auth (advisor do Supabase) |
| C8 | Baixa | Resíduo do achado 4: equipe no WhatsApp sem checagem de permissão por ação |

**C1. Alta — Tokens das redes sociais.**
- **O que acontece:** a política `Membros leem conexoes do negocio` é `is_tenant_member(tenant_id)`. O `GRANT` por coluna da `drizzle/0008` (sem os tokens) não vale, porque `authenticated` tem `SELECT` na tabela.
- **Efeito:** barbeiro ou recepção leem pela API os tokens da conta do negócio e postam como ele. Isso contraria `src/lib/AGENTS.md` ("leitura do membro sem tokens"). Hoje há 0 conexões, então nada vazou.
- **Correção:** `REVOKE ALL ON public.conexoes_sociais FROM anon, authenticated;` e depois o `GRANT SELECT (…)` da 0008 de novo.

**C2. Média — `tenants` inteiro para o anônimo.**
- **O que acontece:** a política `publico ve barbearias ativas` (`ativo = true`) somada ao `SELECT` de tabela expõe `plano`, `assinatura_status`, `desconto_percentual`, `teste_fim`, `teste_negado`, `indicacao_codigo`, `envios_auto_*` etc.
- **Correção:** `REVOKE SELECT ON public.tenants, public.servicos, public.profissionais FROM anon;` e os `GRANT SELECT (…)` atuais. Isso também fecha o 12. Conferir antes se a página pública só usa as colunas liberadas.

**C3. Média — `state` do OAuth reutilizável.**
- **Onde:** `src/lib/redes-sociais.server.ts` (`assinarEstado`/`verificarEstado`).
- **O que acontece:** `state = tenantId.HMAC(tenantId)`. A comparação é em tempo constante, mas o valor nunca muda.
- **Efeito:** quem viu o `state` uma vez (histórico do navegador, logs, ex-funcionário) liga a **própria** conta ao negócio a qualquer momento (CSRF de login).
- **Correção:** `nonce` de uso único, `user_id` de quem iniciou e prazo curto.

**C4. Média — Formulário "Pedir projeto" no banco novo.**
- **O que acontece:** `enviarPedidoDeProjeto` grava com a chave pública, como `anon`. No `cortai-prod`, `pedidos_de_projeto` só tem SELECT e UPDATE para admin. Sem política de INSERT, o RLS recusa a gravação.
- **Correção:** trazer a política de INSERT do banco antigo (ou gravar pelo servidor) junto com o limite do N4.

**C5. Baixa — Fiado.**
- **Onde:** `src/lib/financeiro.functions.ts`, por volta da linha 906.
- **O que acontece:** com `confirmar_pagamento` (conferido), o servidor grava `pagamentos` confirmado, depois `caixa_movimentos` e depois o fiado, em chamadas separadas e sem chave de idempotência.
- **Efeito:** uma falha no meio, ou um clique duplo, deixa os números do caixa desencontrados.
- **Correção:** uma RPC única, como `confirmar_pagamento_comanda_segura`.

**C6, C7, C8:**
- **C6:** usar `auth.uid()` em `has_role` quando quem chama não é o servidor.
- **C7:** ligar a proteção em Auth → Password security.
- **C8:** `acaoPermitida` (`brain/acoes.server.ts`) confere as permissões só no canal `painel`.

### Estado dos achados antigos que acima ficaram "não reverificados"

- **11:** **Aberto** (decisão de produto).
- **13:** **Aberto**. `ia/acoes.server.ts:365` ainda "cancela primeiro e recria".
- **14:** **Aberto**. `admin.functions.ts` ainda faz `select("tenant_id")` e conta no servidor.
- **15:** **Aberto** também nos contadores não atômicos (`cupons.usos + 1`, `nao_lidas + 1`) e no `JSON.parse` sem `try` em `whatsapp/eventos.ts:70`.
- **16:** a origem do IP foi corrigida, mas `salvarRascunhoDeBarbearia` e `publicarRascunhoDeBarbearia` continuam **sem limite**.

### Ordem sugerida (encaixando com a lista acima)

1. **N1** (credenciais), como acima.
2. **C1, C2 e C4 numa migração só de acréscimo** (`REVOKE` de tabela + `GRANT` por coluna + INSERT de `pedidos_de_projeto`), **antes de qualquer cliente real no banco novo**. Depois, rodar de novo a lista de privilégios.
3. **C3:** `nonce` no OAuth, antes de ligar as chaves reais do Instagram/TikTok.
4. **Achado 6 (resto), N4, 16 e C5.**
5. **Limpezas:** C6, C7, C8, 12–15 e 10.
