REVOKE EXECUTE ON FUNCTION public.alterar_slug_do_tenant(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.resolver_tenant_por_slug(text) FROM anon, authenticated;

CREATE POLICY "Donos consultam aliases do proprio tenant"
ON public.tenant_slug_aliases
FOR SELECT
TO authenticated
USING (private.is_tenant_owner(tenant_id));