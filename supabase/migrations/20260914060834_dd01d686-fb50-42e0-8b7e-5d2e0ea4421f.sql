REVOKE EXECUTE ON FUNCTION public.entrar_na_fila_publica(text, text, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fila_publica_status(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.home_publicada() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.configuracao_visual_global() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.contato_da_plataforma() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.entrar_na_fila_publica(text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fila_publica_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.home_publicada() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.configuracao_visual_global() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.contato_da_plataforma() TO service_role, authenticated;