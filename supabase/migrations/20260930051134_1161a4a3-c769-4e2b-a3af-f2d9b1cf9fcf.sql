REVOKE ALL ON FUNCTION public.marcar_falta(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_falta(uuid) TO service_role;