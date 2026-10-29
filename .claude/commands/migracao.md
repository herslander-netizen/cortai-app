---
description: Cria uma migração de banco com segurança, ensaia no banco real (sem gravar) e só aplica com autorização
argument-hint: "[o que a migração deve fazer]"
---

Crie uma migração de banco para o Flow: **$ARGUMENTS**

Leia antes o topo do `AGENTS.md`, o `CLAUDE.md` (seções "Arquitetura e segurança" e "Auditoria e segurança") e o `MUSE.md`. Vale tudo isto: preservar o que funciona, correção cirúrgica, **sem apagar dados**. O banco é o Supabase `cortai-prod` (`ibsberidejlbczxrweqg`).

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
4. **Ensaio (nada fica gravado):** primeiro no banco local descartável (`supabase/baseline/ensaio/ensaio-local.sh`). Se precisar conferir no banco real, use o conector do Supabase (`execute_sql`, projeto `ibsberidejlbczxrweqg`) com um bloco único:
   `DO $wrap$ BEGIN EXECUTE $mig$ <SQL da migração> $mig$; EXECUTE $tst$ <bloco de teste> $tst$; END $wrap$;`
   O resultado volta na mensagem de erro (por exemplo "ESCRITA OK: 76 verificações"), e tudo é desfeito. Use tags de dólar diferentes das usadas dentro do SQL.
5. **Duas rodadas:** rode o teste **antes** (sem a migração) e **depois** (com ela). O "antes" deve mostrar as falhas que a migração corrige; o "depois" deve passar. Rode também os testes existentes (`supabase/tests/*.sql` e `tests/sql/*.sql`) para provar que nada regrediu, e compare com o resultado de antes.
6. **Salvar:** faça commit na branch `cloudflare-workers-migration-2026-10-13` (nunca na `main`), reserve o número da migração no `DIARIO.md` e envie.

## Aplicar no banco só com autorização

Mostre o resultado do ensaio e **pergunte**. O banco afeta o negócio de verdade. Se o dono autorizar:
1. Rode o workflow **"Aplicar migrações novas"** no GitHub Actions, informando o arquivo (`drizzle/migrations/NNNN_x.sql`) e digitando `APLICAR`. Ele aplica numa transação e registra em `cortai_controle.migracoes_aplicadas` (arquivo já registrado é pulado).
2. Rode o teste de novo no banco já alterado, só para conferir.
3. Registre no `DIARIO.md` e atualize "Auditoria e segurança" do `CLAUDE.md` se a migração fechar algum achado.

Se algo der errado, escreva uma migração de reversão que recoloca as regras antigas (não apague dados para voltar).
