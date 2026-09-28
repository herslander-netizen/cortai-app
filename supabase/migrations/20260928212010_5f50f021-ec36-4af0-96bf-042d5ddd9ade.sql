REVOKE ALL ON FUNCTION public.criar_barbearia(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_barbearia(text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.alterar_segmento_do_tenant(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_segmento_do_tenant(uuid, text) TO service_role;