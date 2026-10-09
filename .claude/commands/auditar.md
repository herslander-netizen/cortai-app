---
description: Refaz a auditoria de segurança com a lista fixa de verificações e atualiza o relatório em docs/
argument-hint: "[área opcional: banco, servidor, rotas, ia, whatsapp, pagamentos]"
---

Faça uma auditoria de segurança **somente leitura** do Cortaí. Foco: `$ARGUMENTS` (vazio = tudo). Não corrija nada; relate.

Comece lendo `docs/auditoria-2026-10-09.md`. Para **cada achado antigo**, confira no código e no banco se continua aberto ou foi corrigido, e registre o estado.

## Verificações

**Banco (só o catálogo, via `mcp__Lovable__query_database`, projeto `a3550de1-ec98-4622-8484-7dadb8b04ed0`). Nunca leia dados de clientes; contagens são aceitas.**
- Políticas de escrita (`ALL`, `INSERT`, `UPDATE`, `DELETE`) para `authenticated` cuja regra só use `is_tenant_member`, sem `has_tenant_permission`, `tem_alguma_permissao` ou `permissao_efetiva`: consulta em `pg_policies`.
- Permissões de coluna do papel `anon` (`information_schema.column_privileges`): dados internos expostos (comissão, `user_id`, telefone).
- Funções `SECURITY DEFINER` executáveis por `anon` ou por `authenticated`, e se conferem `auth.uid()` e o vínculo com o negócio por dentro.
- Tabelas com RLS desligado, e tabelas só de inclusão (`pagamentos`, `movimentos`) com política de `UPDATE` ou `DELETE`.
- Buckets do Storage públicos e tipos de arquivo aceitos.

**Código (`grep` em `src`)**
- `.ilike(` ou `.like(` recebendo texto digitado: `%` e `_` viram curinga.
- `createServerFn` com `supabaseAdmin` sem `exigirPermissao` ou `tenantIdDoMembro`.
- Funções do servidor sem `requireSupabaseAuth` que não sejam públicas por desenho; as públicas precisam de limite de tentativas (`limitarPublico`, `barrarAbusivo`).
- Rotas em `src/routes/api/public/**`: assinatura ou segredo conferido em tempo constante, falha fechada quando o segredo falta, idempotência por entrega.
- Identificador de visitante vindo do primeiro valor de `x-forwarded-for` (forjável); o correto é `ipDaChamada()`.
- Chamadas ao banco com `as never` ou `any` que escondem erro de tipo.
- Segredos no repositório: o `.env` só pode ter chaves públicas; procure `service_role`, `sk_` e `secret`.
- Ações de IA (`src/lib/brain`): escrita sem confirmação, ação de pagamento, papel ignorado em algum canal.
- Dinheiro: código que marque pago ou confirmado sem passar pela função oficial de confirmação.
- Rotas ou links que apontam para páginas inexistentes (ex.: `/painel`).

## Resposta e relatório

1. Atualize `docs/auditoria-AAAA-MM-DD.md` com a data de hoje: se já existir um arquivo, edite-o; se for outra data, crie um novo e mantenha o antigo. Cada achado tem severidade, onde está, o que acontece, o efeito e a correção sugerida. Marque os antigos como **Corrigido (commit)** ou **Aberto**.
2. Seja honesto sobre cobertura: diga o que foi lido e o que **não** foi. Conclusão baseada só em leitura não é teste; diga quando algo não foi exercitado.
3. Resuma no chat: achados novos, os ainda abertos, e a ordem de correção sugerida.
4. Não envie nada para a `main` sem autorização; salve o relatório numa branch `claude/auditoria-AAAA-MM-DD`.
