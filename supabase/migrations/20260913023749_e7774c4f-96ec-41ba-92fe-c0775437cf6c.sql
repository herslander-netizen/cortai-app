DROP POLICY IF EXISTS "recursos_do_tenant_leitura_publica" ON public.recursos_do_tenant;

CREATE POLICY "recursos_do_tenant_leitura_membros"
ON public.recursos_do_tenant
FOR SELECT
TO authenticated
USING (public.is_tenant_member(tenant_id));

REVOKE SELECT ON public.recursos_do_tenant FROM anon;

REVOKE EXECUTE ON FUNCTION public.configuracao_visual_global() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recurso_do_tenant_ativo(uuid, text) FROM anon;