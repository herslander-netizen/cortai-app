DROP POLICY IF EXISTS "publico ve barbearias ativas" ON public.tenants;
REVOKE SELECT ON public.tenants FROM anon;