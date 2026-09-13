DROP POLICY IF EXISTS "publico ve produtos ativos" ON public.produtos;
REVOKE SELECT ON public.produtos FROM anon;