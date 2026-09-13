REVOKE EXECUTE ON FUNCTION public.contato_da_plataforma() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contato_da_plataforma() TO service_role;