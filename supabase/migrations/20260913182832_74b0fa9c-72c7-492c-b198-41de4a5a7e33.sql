REVOKE EXECUTE ON FUNCTION public.home_publicada() FROM anon;
REVOKE EXECUTE ON FUNCTION public.home_publicada() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_publicada() TO authenticated, service_role;

DROP POLICY IF EXISTS "cliente ve seus proprios dados" ON public.clientes;