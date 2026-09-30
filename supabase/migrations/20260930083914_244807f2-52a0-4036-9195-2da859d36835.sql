REVOKE EXECUTE ON FUNCTION public.salvar_comanda_segura(uuid, uuid, jsonb, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.salvar_comanda_segura(uuid, uuid, jsonb, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.salvar_comanda_segura(uuid, uuid, jsonb, integer) TO service_role;