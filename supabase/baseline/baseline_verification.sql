-- Cortaí: verificações somente leitura para executar APÓS a baseline.
-- Não cria, altera nem remove objetos. Executar apenas no projeto cortai-prod.
-- Estas consultas não substituem backup nem teste de integração.

-- 1) Tabelas de aplicação em public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2) Tabelas public sem RLS habilitado (esperado: nenhuma tabela sensível)
SELECT n.nspname AS schema_name, c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
ORDER BY c.relname;

-- 3) Policies RLS existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4) Funções customizadas em public e flags de segurança
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname, arguments;

-- 5) Triggers de aplicação
SELECT event_object_table AS table_name, trigger_name, action_timing,
       event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6) Foreign keys e constraints
SELECT tc.table_name, tc.constraint_name, tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.constraint_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 7) Extensões instaladas (não instalar automaticamente)
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;

-- 8) Sinais de seeds de teste conhecidos (esperado: zero)
-- Consulta defensiva: só executa se a tabela existir.
DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL THEN
    RAISE NOTICE 'tenants existentes: %', (SELECT count(*) FROM public.tenants WHERE slug = 'ma-barbearia');
  END IF;
  IF to_regclass('public.envios_de_whatsapp') IS NOT NULL THEN
    RAISE NOTICE 'envios de teste conhecidos: %', (SELECT count(*) FROM public.envios_de_whatsapp WHERE id = '7e570000-0000-4000-8000-000000000001');
  END IF;
END $$;
