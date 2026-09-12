ALTER FUNCTION public.registrar_venda_produto(uuid, integer, text) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.registrar_venda_produto(uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_venda_produto(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_venda_produto(uuid, integer, text) TO service_role;