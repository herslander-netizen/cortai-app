# C1 — Fechar a leitura pública de comissão e vínculo de conta

Escopo: só `servicos.comissao_percentual` e `profissionais.user_id` para quem não está logado (papel `anon`). Nada mais muda.

## Fatos confirmados (leitura do catálogo e do código, 11/10/2026)

**Banco**
- `relacl` das duas tabelas: `anon=arwdDxtm` e `authenticated=arwdDxtm`, ou seja, permissão em nível de TABELA para tudo.
- `has_column_privilege('anon', ...)` = true em todas as colunas, inclusive `comissao_percentual` e `user_id`.
- Políticas para `anon`: "publico ve servicos ativos" e "publico ve profissionais ativos" (SELECT com `ativo = true` e negócio ativo). Elas filtram linhas, não colunas.
- Não existe política de escrita para `anon` nessas tabelas: as escritas já são bloqueadas pelo RLS.
- Nenhuma view do schema `public` lê essas tabelas.
- Funções sem privilégio de dono (invoker) que `anon` pode executar e que citam as tabelas: `permissoes_padrao` e `teto_do_papel` (não leem as colunas) e `agendamento_validar_integridade`. Esta última é um gatilho de `agendamentos`, e `anon` não grava em `agendamentos`.

**Conclusão técnica:** revogar só a coluna (`REVOKE SELECT (coluna)`) NÃO funciona enquanto existir o SELECT em nível de tabela. O Postgres libera a coluna se houver permissão na tabela ou na coluna. É preciso revogar o SELECT de tabela do `anon` e conceder SELECT coluna a coluna, apenas nas colunas seguras.

**Código: quem lê essas tabelas sem login**

| Tela | Função | Acesso | Colunas lidas |
|---|---|---|---|
| `/b/$slug` (vitrine) | `publico.functions.ts` (~l.86 e 92) | admin no servidor | servicos: id, nome, duracao_min, preco_centavos · profissionais: id, nome, avatar_url, descricao, portfolio |
| `/agendar/$slug` | `agendamento-publico.functions.ts` `getAgendaPublica` (l.174/180), `agendarComoConvidado` (l.342/349), `getPreviaDaBarbearia` (l.612) | admin | sem comissao, sem user_id |
| Cortaí Chat público | `agenda-chat.functions.ts` (l.81/87) | admin | id, nome, duracao_min, preco_centavos, profissional_ids · id, nome |
| Loja `/loja/$slug` | `loja.functions.ts` `getLojaPublica` | admin | não lê servicos/profissionais |
| Capa `/api/public/capa/$slug` | `capa.$slug.ts` | admin | só `tenants` e storage |
| Clientes públicos do servidor (chave pública) | `institucional`, `parceiros`, `admin.getGlobalDesign` | anon | não leem essas tabelas |
| MCP | `mcp/supabase.ts` `supabaseForUser` | usuário logado (`authenticated`) | não usa `anon` |

- Nenhum componente ou rota do navegador lê `servicos`/`profissionais` com o cliente do navegador. As leituras com `context.supabase` estão em funções do servidor com login (`authenticated`).
- `select("*")` em `servicos` só em `onboarding.functions.ts` (l.181 e 499), que roda logado e com admin. Não é afetado.
- `comissao_percentual` aparece só em telas internas (`financeiro.functions.ts:110`, `FechamentoComanda.tsx`) e `user_id` em `whatsapp-equipe.functions.ts:96`. Todos com login.

**Impacto esperado por tela:** nenhum. Todas as telas públicas leem pelo servidor com acesso de administrador, que não depende das permissões do `anon`.

## Hipóteses (não confirmadas)
- H1: algum cliente externo (integração, app antigo, PWA em cache) lê essas tabelas direto pela API com a chave pública. Não há evidência no código; só os logs de API diriam.
- H2: um PWA antigo em cache pode ter um bundle que lia direto. É improvável, porque o código atual não faz isso e o histórico não foi checado.

## Mudança mínima proposta (uma migração, só de acréscimo/ajuste de permissão)

```sql
REVOKE SELECT ON public.servicos FROM anon;
GRANT SELECT (id, tenant_id, nome, duracao_min, preco_centavos, ativo, ordem,
              criado_em, categoria, profissional_ids, retorno_dias, foto_url)
  ON public.servicos TO anon;

REVOKE SELECT ON public.profissionais FROM anon;
GRANT SELECT (id, tenant_id, nome, avatar_url, ativo, criado_em, descricao, portfolio)
  ON public.profissionais TO anon;
```

- Não mexe em políticas, no `authenticated`, no `service_role` nem nos dados.
- As subconsultas das políticas `anon` usam `ativo`, `tenant_id` e `tenants`, e continuam liberadas.
- Comportamento da API: `select=*` como `anon` passa a dar erro de permissão (42501) em vez de devolver só parte das colunas. Pedir colunas explícitas continua funcionando. Isso é aceitável porque nenhum código atual faz esse pedido como `anon`.
- Fica fora desta rodada: INSERT/UPDATE/DELETE do `anon` na tabela (já bloqueados pelo RLS, que não tem política de escrita) e a leitura entre negócios por `authenticated` (não há política pública para `authenticated`).
- Coluna nova no futuro: fica fechada para `anon` por padrão, que é o lado seguro. Vou registrar uma regra no `AGENTS.md` lembrando de conceder a coluna se ela precisar ser pública.

## Plano de testes

**Negativos (como `anon`, em transação com ROLLBACK, no formato de `tests/sql/rbac*.sql`)**
- `SELECT comissao_percentual FROM servicos` → erro de permissão.
- `SELECT user_id FROM profissionais` → erro de permissão.
- `SELECT * FROM servicos` e `SELECT * FROM profissionais` → erro.
- `has_column_privilege('anon', ...)` = false nas duas colunas.

**Positivos**
- Como `anon`: selecionar cada coluna segura funciona, e o filtro `ativo`/negócio ativo continua valendo (registro inativo não aparece).
- Como `authenticated` membro: continua lendo `comissao_percentual` e `user_id` do próprio negócio.
- `has_column_privilege('authenticated', ...)` continua true.
- Telas sem login, manualmente/Playwright: `/b/<slug-demo>`, `/agendar/<slug-demo>` (lista, horários e reserva de teste em negócio de teste), Cortaí Chat público, `/loja/<slug>`, capa.
- Com login: Financeiro/Fechamento de comanda (comissão), equipe/WhatsApp da equipe (user_id), onboarding de serviços, MCP `listar-servicos`.
- Rodar `npx vitest run` e `npx tsc --noEmit` (sem mudança de código, só para confirmar).

## Reversão
Uma migração inversa restaura o estado atual:
```sql
GRANT SELECT ON public.servicos TO anon;
GRANT SELECT ON public.profissionais TO anon;
```
Ela não perde dados e é imediata.

## Dependências
- Sua autorização para aplicar a migração; ela vale para a prévia e para o site publicado, porque é um banco só.
- Antes de aplicar, conferir os logs de API das últimas semanas: alguma requisição `anon` a `/rest/v1/servicos` ou `/profissionais` pedindo `*` ou essas colunas? Isso fecha a hipótese H1.
- Registrar a migração na árvore oficial do projeto (`drizzle/migrations`), seguindo o padrão atual.

## Critérios de aceite
1. `anon` não lê `servicos.comissao_percentual` nem `profissionais.user_id` (testes negativos passam).
2. Todas as telas públicas listadas carregam e reservam normalmente.
3. Membros logados continuam vendo comissão e vínculo como hoje.
4. Nenhuma política, dado ou permissão de escrita alterados; o linter do banco não aponta problema novo.
5. A reversão foi testada em transação.

## Detalhes técnicos de suporte
- A regra "tabela OU coluna" do Postgres torna o REVOKE só de coluna ineficaz quando há GRANT de tabela. Por isso a proposta revoga na tabela e concede coluna a coluna.
- A API (PostgREST) respeita as permissões por coluna: `select=*` vira uma lista de todas as colunas e falha se alguma não estiver liberada. Por isso as consultas públicas, se existissem, precisariam de colunas explícitas.
