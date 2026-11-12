# Flow — Implantação controlada da RPC de Pacotes/Combos

**Status:** somente preparada em GitHub. **Não aplicada** ao Supabase de prévia nem ao de produção.
**Escopo:** migração aditiva `drizzle/migrations/0062_pacotes_salvar_atomico.sql`.
**Fonte de verdade:** o SQL da migração 0062 é byte-a-byte igual ao espelho
`docs/sql/pacotes-salvar-atomico-proposta-2026-11-12.sql`. O Actions verifica com `cmp`.

## Evidência de prévia somente leitura (12/11/2026)

Projeto `cortai-preview` (`pfkxvindedkuktogbcsv`): PostgreSQL **17.11**;
`public.pacotes` e `public.pacote_itens` existem, ambas com RLS ativo;
o conjunto soma **8 políticas**;
`public.is_tenant_member(uuid)` e
`public.tem_alguma_permissao(uuid,text[])` existem; `salvar_pacote_atomico`
**não** está instalada. Nada foi modificado nessa consulta.

## Plano de liberação que evita tela quebrada

1. **Revisar e aprovar apenas o PR de migração isolada**, que não modifica
   `src/`, comandos do aplicativo, dados nem fluxos de pagamento. Não confundir
   aprovação do PR com autorização de executar SQL em banco real.
2. Incorporar a migração na branch oficial quando autorizado. A publicação
   automática da prévia por push **não aplica SQL**, e o código antigo continua
   funcional. Não misturar com o PR que troca o endpoint para RPC.
3. **Com aprovação explícita para alterar `cortai-preview`**, rodar o workflow
   manual `Aplicar migrações novas (cortai-preview)`, com o arquivo
   `drizzle/migrations/0062_pacotes_salvar_atomico.sql` e confirmação `APLICAR`.
   O workflow só aceita a branch oficial e alvo fixo `pfkxvindedkuktogbcsv`.
4. Verificar imediatamente **somente leitura**, usando a consulta abaixo.
   Confirmar também funções/roles, comportamento autenticado em tenant fictício,
   criação/edição/erro/concorrência e que a prévia de produção segue isolada.
5. Só depois incorporar os PRs de preço e o PR que troca a gravação REST pela
   RPC, e homologar o fluxo da tela no ambiente de prévia.
6. **Produção tem aprovação separada.** Instalar a mesma migração em
   `cortai-prod` somente com autorização explícita, verificar novamente,
   e apenas então usar o workflow `Lançar versão` para publicar o novo código.

## Consulta de verificação somente leitura

```sql
SELECT
  to_regprocedure(
    'public.salvar_pacote_atomico(uuid,uuid,text,text,text,integer,integer,boolean,boolean,jsonb)'
  ) IS NOT NULL AS instalada,
  (
    SELECT NOT prosecdef
    FROM pg_proc
    WHERE oid = to_regprocedure(
      'public.salvar_pacote_atomico(uuid,uuid,text,text,text,integer,integer,boolean,boolean,jsonb)'
    )
  ) AS security_invoker,
  (
    SELECT has_function_privilege(
      'authenticated',
      'public.salvar_pacote_atomico(uuid,uuid,text,text,text,integer,integer,boolean,boolean,jsonb)',
      'EXECUTE'
    )
    WHERE to_regprocedure(
      'public.salvar_pacote_atomico(uuid,uuid,text,text,text,integer,integer,boolean,boolean,jsonb)'
    ) IS NOT NULL
  ) AS authenticated_execute,
  (
    SELECT has_function_privilege(
      'anon',
      'public.salvar_pacote_atomico(uuid,uuid,text,text,text,integer,integer,boolean,boolean,jsonb)',
      'EXECUTE'
    )
    WHERE to_regprocedure(
      'public.salvar_pacote_atomico(uuid,uuid,text,text,text,integer,integer,boolean,boolean,jsonb)'
    ) IS NOT NULL
  ) AS anon_execute;
```

**Esperado após instalação:** `instalada=true`, `security_invoker=true`,
`authenticated_execute=true`, `anon_execute=false`.

## Limites da prova do Actions

O GitHub Actions aplica `0046` e `0062` **somente** em containers
PostgreSQL 16 e 17 descartáveis, com RLS verdadeiro de Pacotes/Itens da 0046
e fixtures reduzidas para `auth.uid`, permissões, tenant e serviços.
A suite verifica a negativa antes de 0046, reaplicação da migração, 12 cenários
por versão de transações/rollback/RLS, e build/TypeScript/Vitest.

Não substitui migrações anteriores integrais do Flow nem E2E autenticado
de venda de pacote, cobrança, visitas consumidas, saldo, vencimento, renovação,
comanda e emissão de recibo. Tais módulos ainda carecem de desenho de
persistência, idempotência e testes próprios.

**Risco a manter visível:** reenviar uma criação que já foi concluída pode criar
um novo pacote, pois `_pacote_id=null` não fornece chave de idempotência.
Não comercializar venda/renovação de pacotes como fluxo concluído sem resolver
essa questão no ledger de vendas e no motor de cobrança.
