---
description: Cria uma migração de banco com segurança, ensaia no banco real (sem gravar) e só aplica com autorização
argument-hint: "[o que a migração deve fazer]"
---

Crie uma migração de banco para o Cortaí: **$ARGUMENTS**

Leia antes `CLAUDE.md` (seção "Arquitetura e segurança") e `docs/auditoria-2026-10-09.md`. O código sincroniza com o Lovable, então tudo isto vale: preservar o que funciona, correção cirúrgica, **sem apagar dados**.

## Regras da migração

- Só acréscimo. Proibido `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` e `DELETE` de dados. Trocar uma política, função ou gatilho por outro é permitido (`DROP POLICY IF EXISTS` seguido do `CREATE`), desde que o substituto esteja na mesma migração.
- Funções `SECURITY DEFINER` precisam de `SET search_path TO 'public'` e de `REVOKE ALL ... FROM PUBLIC, anon` com `GRANT` só a quem precisa.
- Regra de acesso de escrita para a equipe usa `public.tem_alguma_permissao(tenant_id, ARRAY[...])` ou `has_tenant_permission`. Nunca só `is_tenant_member`.
- Antes de apertar uma regra, confirme no código (`grep` em `src/lib`) quem grava naquela tabela com o login do usuário (`context.supabase`). Funções do servidor com `supabaseAdmin` não são afetadas pelo RLS.

## Passos

1. **Número e arquivo:** veja o último em `drizzle/migrations/` e crie `NNNN_nome_curto.sql` com o próximo número.
2. **Histórico do Drizzle:**
   - Acrescente em `drizzle/migrations/meta/_journal.json` uma entrada com `idx`, `version: "7"`, `when` (milissegundos, `Date.now()`), `tag` (nome do arquivo sem `.sql`) e `breakpoints: true`.
   - Crie `meta/NNNN_snapshot.json` copiando o anterior, com `id` novo e `prevId` igual ao `id` do anterior.
3. **Teste por papel:** se a migração mexe em permissão, acrescente ou ajuste um teste em `tests/sql/` no formato de `supabase/tests/rbac.sql`: um bloco `DO` que cria um negócio de teste com dono, gerente, recepção, barbeiro e estranho, confere o que cada um pode, e **sempre termina com `RAISE EXCEPTION`** para nada ficar gravado.
4. **Ensaio no banco real (nada fica gravado):** use `mcp__Lovable__query_database` (projeto `a3550de1-ec98-4622-8484-7dadb8b04ed0`) com um bloco único:
   `DO $wrap$ BEGIN EXECUTE $mig$ <SQL da migração> $mig$; EXECUTE $tst$ <bloco de teste> $tst$; END $wrap$;`
   O resultado volta na mensagem de erro (por exemplo "ESCRITA OK: 76 verificações"), e tudo é desfeito. Use tags de dólar diferentes das usadas dentro do SQL.
5. **Duas rodadas:** rode o teste **antes** (sem a migração) e **depois** (com ela). O "antes" deve mostrar as falhas que a migração corrige; o "depois" deve passar. Rode também os testes existentes (`supabase/tests/*.sql` e `tests/sql/*.sql`) para provar que nada regrediu, e compare com o resultado de antes.
6. **Salvar:** faça commit numa branch `claude/<nome>` (nunca na `main`) e envie a branch.

## Aplicar no banco só com autorização

Mostre o resultado do ensaio e **pergunte**. A `main` e o banco afetam o negócio de verdade. Se o dono autorizar:
1. Descubra se o Lovable aplica as migrações sozinho ao sincronizar: veja a tabela `drizzle.__drizzle_migrations` (colunas `id`, `hash`, `created_at`). O `hash` é o SHA-256 do arquivo `.sql` e o `created_at` é o `when` do journal.
2. Aplique o SQL numa transação única e, na mesma transação, registre a linha do histórico com esse hash. Assim, se o Lovable tentar rodar o arquivo depois, ele reconhece que já foi aplicado.
3. Rode o teste de novo no banco já alterado, só para conferir.
4. Só então envie a branch para a `main`, e atualize a auditoria se a migração fechar algum achado.

Se algo der errado, escreva uma migração de reversão que recoloca as regras antigas (não apague dados para voltar).
