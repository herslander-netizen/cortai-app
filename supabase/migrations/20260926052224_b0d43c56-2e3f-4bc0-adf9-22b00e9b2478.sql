REVOKE ALL ON FUNCTION public.creditar_fidelidade_da_comanda(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creditar_fidelidade_da_comanda(uuid, uuid) TO service_role;