# Auditoria geral do Cortaí — 13/10/2026

## Resumo executivo

Esta auditoria foi iniciada após relatos de carregamento que permanece em skeleton por vários segundos em duas ou mais telas de `https://cortai.dev`. O resultado mais importante é que a mensagem “Não conseguimos carregar agora. Confira sua conexão e tente novamente.” é mostrada pelo componente compartilhado `RegiaoDeEsqueleto` depois de **10 segundos**. Isso comprova que a região continua em estado de carregamento por esse período; **não prova que o problema seja a internet**. A causa raiz continua sem confirmação porque não recebemos logs de produção nem uma execução concluída dos testes automatizados.

**Base examinada:** `main`, commit `334ca591fd1813619c00f4c055af52c5b874368d` (13/10/2026).

**Tipo de auditoria:** revisão estática do código e do relatório anterior, com tentativa de revalidação do estado publicado. Não foram lidos dados pessoais de clientes. Não foram aplicadas migrações, feitas alterações no banco, corrigida a aplicação, mesclada a `main` ou publicada uma nova versão. Este documento foi salvo apenas na branch `claude/auditoria-2026-10-13`.

## Cobertura e limitações

### Foi examinado

- O relatório `docs/auditoria-2026-10-09.md` e as regras de execução presentes em `CLAUDE.md` e `.claude/commands/verificar.md`.
- A rota inicial, sessão/auth, componente compartilhado de skeleton, camada de erro de rota, inicialização do service worker e recuperação de chunks.
- Código atual relacionado a tenant ativo, permissões da CortAI, fila pública, rascunhos públicos, cancelamento, reagendamento e métricas administrativas.
- Metadados do projeto Lovable: o projeto está marcado como publicado/pronto e o commit informado pelo Lovable coincide com o HEAD do GitHub consultado.
- O código atual da migração `drizzle/migrations/0027_equipe_escreve_com_permissao.sql`.

### Não foi possível concluir

- O conector do Lovable retornou **HTTP 504** em todas as consultas ao catálogo do banco tentadas, inclusive um `SELECT 1`. Por isso, as políticas RLS, permissões de coluna, funções executáveis e configuração dos buckets do banco de produção **não foram revalidadas nesta rodada**. O estado “corrigido” de achados de banco mencionado no relatório anterior permanece pendente de confirmação ao vivo.
- A URL pública não pôde ser exercitada diretamente por este ambiente; não há captura das requisições de rede do celular ou logs de runtime associados aos horários das telas.
- A execução de `tsc`, Vitest, ESLint e build foi concluída no ambiente de desenvolvimento do Lovable em modo somente leitura. Os resultados são registrados na seção “Verificações automatizadas”; o build passou, mas TypeScript e alguns testes falharam.
- Não houve teste de penetração, teste de mutação de produção, verificação visual automatizada ou leitura de dados de clientes.

## P0 — Bloqueio relatado: carregamento em múltiplas telas

**Estado: causa raiz não confirmada; investigação prioritária.**

### Evidência

Arquivo: `src/components/layout/Esqueleto.tsx`

`RegiaoDeEsqueleto` inicia um timer de 10.000 ms ao montar. Quando o timer dispara, substitui o skeleton por um alerta genérico com a mensagem “Não conseguimos carregar agora. Confira sua conexão e tente novamente.” O componente não verifica por si só se a conexão caiu nem se a operação de dados falhou; ele apenas mede quanto tempo a região ficou nessa renderização.

Esse componente é compartilhado por telas como:

- `src/routes/app.perfil.tsx`, cujo carregamento de sessão chama `getSessao()`;
- `src/routes/app.historico.tsx`, que chama `listarAgendamentosCliente()`;
- `src/routes/barbeiro.agendamentos.tsx`, que chama `listarAgendamentosConfirmados()`.

Portanto, várias causas são possíveis: uma função do servidor lenta, consulta/RPC do Supabase sem resposta, sessão/token, exceção de servidor, falha de rede real ou outra dependência de carregamento. As capturas, isoladamente, não distinguem essas hipóteses.

### Fatores técnicos relacionados a investigar

- `src/integrations/supabase/auth-middleware.ts` valida token com `supabase.auth.getClaims(token)`; não há timeout explícito definido nessa chamada pelo código deste middleware. Isso é uma hipótese para investigar, não prova de que esteja travando.
- `src/lib/sessao.functions.ts` faz várias consultas em paralelo depois de garantir o perfil. Precisamos descobrir qual, se alguma, está demorando ou falhando no ambiente publicado.
- `src/routes/__root.tsx` inicializa service worker e recuperação de chunks. O service worker parece intencionalmente restrito a assets versionados e navegação offline; não há evidência estática suficiente para atribuir a ele a falha.
- `src/server.ts` converte algumas falhas catastróficas de SSR numa página de erro HTTP 500, mas isso não explica sozinho skeletons que aparecem dentro de rotas já renderizadas.

### Próximos testes necessários (sem alterar produção)

1. Capturar, no navegador, as requisições que permanecem pendentes ou falham (URL/função, status HTTP, duração e mensagem; redigir tokens, cookies e dados pessoais).
2. Correlacionar o horário exato do teste aos logs do runtime/servidor e Supabase, começando pelas funções do caminho afetado.
3. Comparar uma tela de cliente e uma tela do negócio, depois testar a mesma conta em aba anônima e em outra rede. Isso separa problemas de sessão/cache, rede e dependências compartilhadas.
4. Depois de isolar a chamada, adicionar timeout/retry/telemetria apenas no ponto necessário e criar teste de regressão; não aumentar ou remover o timer de 10 s como substituto da correção da causa.

## P1 — Permissões da CortAI no WhatsApp: possível brecha de autorização

**Estado: aparente no código atual; requer correção e testes dedicados após confirmação.**

Arquivos: `src/lib/brain/acoes.server.ts` e `src/lib/whatsapp/fluxo.server.ts`.

No fluxo WhatsApp, o contexto enviado ao cérebro inclui negócio, canal, ator, telefone do cliente, papel e profissional, mas não inclui a lista de permissões efetivas resolvidas para a equipe. Em `acaoPermitida`, quando se trata de equipe no WhatsApp, o código tem um ramo que trata `a.papeis` e, se isso não se aplicar, verifica o canal/papel; ele não executa `permitidoNoPainel` nem verifica `a.permissoes` nessa ramificação.

Isso parece manter regras de papel, mas não a autorização por permissão específica que o painel usa. Para ações da equipe cuja definição depende de `permissoes` e não tem uma restrição equivalente por `papeis`, o comportamento pode permitir mais do que a autorização configurada para aquela pessoa.

**Impacto potencial:** um membro verificado da equipe pode conseguir acionar no WhatsApp uma operação que o seu conjunto de permissões deveria impedir. O alcance real depende das definições de cada ação e do vínculo de telefone, portanto precisa ser testado com matriz de papéis/permissões em ambiente de teste.

**Correção sugerida:** resolver as permissões efetivas da equipe no servidor para o contexto WhatsApp e aplicar a mesma autorização por ação antes de listar ferramentas e novamente antes de executar uma ação pendente confirmada. Criar testes negativos para dono, gerente, recepção e profissional, sem usar dados reais.

## P1 — Reagendamento da CortAI pode restaurar o horário como um novo registro

**Estado: caminho de recuperação continua presente no código atual.**

Arquivo: `src/lib/ia/acoes.server.ts`, função `remarcarAgendamento`.

A função tenta criar o novo horário antes de cancelar o antigo, o que é uma proteção válida. No caminho alternativo em que o agendamento original impede o novo horário, o sistema pode cancelar o original e tentar criar o novo. Se essa segunda criação falhar, o catch tenta criar um agendamento no horário original, ignorando falha com `.catch(() => undefined)`.

Esse fallback cria um novo registro em vez de reabrir o original e pode perder identidade e metadados associados ao antigo registro, como comanda, token, origem ou preferências. É um caminho excepcional, mas pode deixar a agenda em estado inesperado se a restauração falhar.

**Correção sugerida:** desenhar a operação como transação/RPC atômica no banco, ou implementar uma restauração que preserve o ID e as relações do original. Testar o caminho de conflito, falha de criação e falha de cancelamento em banco de teste. Não alterar a regra durante esta auditoria.

## P1/P2 — Rate limit nos rascunhos de negócio públicos

**Estado: IP mais confiável foi adotado; limite de salvamento/publicação ainda aparenta incompleto.**

Arquivo: `src/lib/rascunho.functions.ts`.

A função `origem()` usa `ipDaChamada(getRequest())`, corrigindo o antigo padrão vulnerável a confiar no primeiro valor de `x-forwarded-for`. Porém:

- `freioDeAbuso` retorna sem limitar quando o IP é `"desconhecido"` (fail-open);
- a chamada ao freio está na criação do rascunho;
- `salvarRascunhoDeBarbearia` e `publicarRascunhoDeBarbearia` não chamam o mesmo limitador no código inspecionado.

**Impacto potencial:** uso abusivo para gerar ou modificar rascunhos e carga no banco/servidor. Não foi realizado teste de abuso em produção.

**Correção sugerida:** falhar de forma segura para a ausência de IP confiável, adicionar rate limit distribuído por IP e token/operação a criar, salvar e publicar, e cobrir com testes automatizados.

## P2 — Métricas administrativas podem subcontar agendamentos

**Estado: problema visível no código atual.**

Arquivo: `src/lib/admin.functions.ts`, `getAdminTenants`.

A função busca `agendamentos` usando `select("tenant_id")` e conta as linhas em JavaScript. Com o limite padrão de linhas do cliente/API, se houver mais linhas do que o limite retornado, a contagem por negócio pode ficar incompleta sem erro explícito. Outras métricas administrativas também agregam conjuntos de linhas na aplicação e devem ser avaliadas por volume.

**Correção sugerida:** fazer a contagem/agregação no banco (RPC ou consulta com count/agrupamento adequado) e testar com mais registros do que o limite padrão.

## P2 — Agendamento público pode reutilizar telefone de outra pessoa

**Estado: risco reportado em 09/10/2026; não fechado nesta revisão.**

A auditoria anterior descreveu que o agendamento como convidado encontra/reutiliza a ficha do cliente pelo telefone fornecido e que não há prova de posse do número antes de enviar confirmação. A revisão atual não localizou um desafio OTP que feche esse cenário. Isso deve ser considerado um risco ainda não resolvido até a equipe de produto decidir o fluxo.

**Correção sugerida:** verificar o telefone por código antes de reutilizar uma ficha existente, ou deixar o novo agendamento pendente de confirmação do titular. Não mudar o fluxo sem decidir o impacto de produto.

## P2 — Achados antigos: estado observado no código e ressalvas

| Achado anterior | Estado nesta revisão | Evidência/limitação |
|---|---|---|
| Papel de admin concedido por curinga em e-mail | **Aparentemente corrigido no código** | `src/lib/sessao.functions.ts` usa comparação exata via `mesmoEmail`; não houve teste adversarial. |
| Vínculo com o negócio errado em contas multi-tenant | **Aparentemente corrigido no código** | `src/lib/tenant.ts` consulta vínculos ordenados e usa `escolherVinculo` com `perfis.tenant_ativo`. |
| RLS para escrita em `movimentos`, `agendamentos`, serviços/profissionais/horários/produtos | **A correção é documentada; estado de produção não revalidado** | Migração `0027_equipe_escreve_com_permissao` está no repositório, e a auditoria de 09/10 diz que foi aplicada. Falha 504 impediu confirmação do catálogo atual. |
| Limite de uso da CortAI no site / IP de visitante | **Aparentemente endereçado no código** | `secretaria-publica.functions.ts` usa `ipDaChamada`, `barrarAbusivo` e `bloqueioDeUso`; precisa de teste de ponta a ponta. |
| Limite de entrada na fila pública | **Aparentemente endereçado no código** | `fila-publica.functions.ts` chama `aplicarLimiteDaFila` com IP confiável e telefone normalizado. Não executado contra o banco real. |
| Links de notificação apontando para `/painel` inexistente | **Corrigido no código inspecionado** | `whatsapp/fluxo.server.ts` e `push/aviso-sininho.server.ts` usam `LINKS_DE_TELA.inicio`, definido como `/barbeiro`. |
| Prazo mínimo de cancelamento do cliente | **Implementação presente no código** | `prazo-cancelamento.server.ts` é chamado por `cancelarComoConvidado`; não houve teste funcional em produção. |
| Dados sensíveis de colunas expostos ao papel `anon` (`comissao_percentual`, `user_id`) | **Pendente, prioridade de segurança** | Auditoria anterior apontou grants por coluna; a consulta atual ao catálogo de privilégios retornou 504. O plano de alteração C1 foi parado anteriormente; nenhuma migração foi aplicada por esta auditoria. |
| Contagem administrativa após 1.000 linhas | **Ainda aparenta aberto** | `getAdminTenants` traz `tenant_id` de todos os agendamentos e agrega em JavaScript. |
| Fila pública sem rate limit | **Aparentemente corrigido no código** | Limitador aplicado em `entrarNaFilaPublica`; precisa confirmar o comportamento com teste. |
| Rascunho público sem limitação suficiente | **Parcialmente aberto** | IP confiável já é usado, mas salvar/publicar não chamam limitador e IP desconhecido ignora limite. |
| Duplo sistema de migração e casts `as never` | **Risco de manutenção** | `supabase/migrations` e `drizzle/migrations` coexistem; requer governança e revisão gradual. |
| Resíduo de endpoints legados da ALVO IA, tipos de arquivo no Storage, JSON em webhook e outras questões menores | **Não revalidados nesta rodada** | Permanecem listados no relatório anterior e precisam de revisão específica. |

## Verificações automatizadas

| Verificação | Resultado desta rodada |
|---|---|
| `npx tsc --noEmit -p .` | **Falhou (exit 2): 11 erros de tipo.** A base descrita em 09/10 tinha 0. |
| `npx vitest run` | **Falhou (exit 1): 150 arquivos; 149 passaram e 1 falhou.** 1.417 testes no total: 1.412 passaram, 4 falharam e 1 foi ignorado. |
| `npx eslint .` | **Falhou (exit 1): 5.022 problemas**, sendo 4.804 de Prettier, 185 de `@typescript-eslint/no-explicit-any` e 4 de `react-hooks/exhaustive-deps`. A contagem parece ligeiramente melhor que a base documentada (5.042), mas ainda são milhares de problemas preexistentes. |
| `npx vite build --outDir /tmp/verif/dist` | **Passou (exit 0)**; build cliente/servidor concluído. O Vite também gerou artefatos em diretórios ignorados (`dist/` e `node_modules/.nitro`), mas `git status` permaneceu limpo. |
| GitHub checks para o commit examinado | O conector retornou lista de status vazia e nenhuma execução associada disponível por esta ferramenta. Isso não prova, por si só, que não exista CI configurado. |
| Catálogo de banco / RLS / grants / storage | **Bloqueado por HTTP 504** do conector Lovable; inclusive `SELECT 1` não respondeu. |

Como referência histórica, o relatório anterior/documentação do projeto descreve uma base em que `tsc` tinha zero erros, `vite build` passava, Vitest tinha oito falhas de datas fixas em `src/lib/whatsapp/lembretes-numeros.test.ts`, e o ESLint mostrava milhares de problemas preexistentes. Esses números **não representam a execução atual** e precisam ser confirmados novamente.


### Detalhe dos erros que precisam ser acompanhados

**TypeScript (11 erros):**
- Seis usos do tom `"erro"`, que não pertence ao tipo `TomDeAviso` (tons aceitos: `info`, `atencao`, `sucesso`, `acao`): `src/routes/admin.monetizacao.tsx` (linhas 155, 456, 840 e 1072), `src/routes/convite.tsx:122` e `src/components/onboarding/EditorDeHorarios.tsx:219`.
- Três manipuladores de clique retornam `boolean` em vez de `void` ou `Promise`: `src/components/agendamento/HorariosOcupados.tsx:41`, `src/components/layout/NavegacaoEquipe.tsx:86` e `src/components/pwa/AvisoDeVersao.tsx:76`.
- Dois casos de `subtitle` possivelmente indefinido incompatível com `exactOptionalPropertyTypes`: `src/components/layout/AdminScreen.tsx:18` e `src/components/layout/Screen.tsx:45`.

O Vite conseguir gerar os bundles não substitui o typecheck; o build não rejeitou esses erros estáticos.

**Vitest (4 falhas):**
- As quatro falhas estão em `EditorDeServicos.test.tsx` e apresentam `TypeError: window.matchMedia is not a function`. É plausível que o setup de testes precise simular `matchMedia` após alteração do componente, mas isso precisa ser confirmado antes de decidir se é uma falha exclusiva de ambiente ou um comportamento regressivo.
- Os oito testes antigos de datas em `src/lib/whatsapp/lembretes-numeros.test.ts`, documentados como falha conhecida em 09/10, agora passam.

## Ordem recomendada de correção

1. **Diagnosticar o carregamento em produção** com network trace e logs correlacionados antes de mudar timers ou cache.
2. **Fechar a autorização por ação no WhatsApp da equipe**, com teste para cada papel/permissão e execução de ações pendentes.
3. **Corrigir atomicidade/rollback da remarcação** e testar as falhas no banco de teste.
4. **Aplicar rate limit em todas as operações de rascunho** e definir comportamento seguro quando não há IP confiável.
5. **Corrigir agregações administrativas** para não depender de páginas de até 1.000 linhas.
6. **Revalidar RLS/grants e Storage ao recuperar acesso ao catálogo de produção**, incluindo as colunas `servicos.comissao_percentual` e `profissionais.user_id`.
7. Reexecutar typecheck, testes, lint e build; depois executar testes de regressão visual/mobile e verificar a versão publicada.

## Integridade da auditoria

- Nenhum dado de cliente foi consultado.
- Nenhuma instrução SQL de escrita, migração ou alteração de configuração foi executada.
- Nenhum arquivo da aplicação foi alterado.
- O relatório foi gravado somente na branch `claude/auditoria-2026-10-13`; a `main` e o site publicado não foram alterados.
- Achados marcados como “aparentemente corrigidos” foram inferidos da leitura do código; não substituem testes de runtime ou confirmação no banco de produção.
