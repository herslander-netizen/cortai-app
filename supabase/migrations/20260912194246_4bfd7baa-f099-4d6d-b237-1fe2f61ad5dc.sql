REVOKE ALL ON FUNCTION public.registrar_mudanca_de_plano() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_mudanca_de_plano() TO service_role;

CREATE OR REPLACE FUNCTION public.registrar_acesso_do_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_tenant_member(_tenant_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  UPDATE public.tenants
  SET ultimo_acesso_em = now()
  WHERE id = _tenant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_acesso_do_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_acesso_do_tenant(uuid) TO authenticated;