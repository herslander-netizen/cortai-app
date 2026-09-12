CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_tenant_owner(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1
    FROM public.tenant_usuarios tu
    WHERE tu.tenant_id = _tenant_id
      AND tu.user_id = auth.uid()
      AND tu.papel = 'dono'
  )
$$;
REVOKE ALL ON FUNCTION private.is_tenant_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_tenant_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "dono atualiza marca e dados do tenant" ON public.tenants;
CREATE POLICY "dono atualiza marca e dados do tenant"
ON public.tenants FOR UPDATE TO authenticated
USING (private.is_tenant_owner(id))
WITH CHECK (private.is_tenant_owner(id));

DROP POLICY IF EXISTS "dono le historico da marca" ON public.tenant_branding_versions;
CREATE POLICY "dono le historico da marca"
ON public.tenant_branding_versions FOR SELECT TO authenticated
USING (private.is_tenant_owner(tenant_id));

DROP POLICY IF EXISTS "dono cria versao da marca" ON public.tenant_branding_versions;
CREATE POLICY "dono cria versao da marca"
ON public.tenant_branding_versions FOR INSERT TO authenticated
WITH CHECK (private.is_tenant_owner(tenant_id) AND criado_por = auth.uid());

DROP POLICY IF EXISTS "dono le logos do tenant" ON storage.objects;
CREATE POLICY "dono le logos do tenant"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tenant-logos' AND private.is_tenant_owner(((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "dono envia logos do tenant" ON storage.objects;
CREATE POLICY "dono envia logos do tenant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tenant-logos' AND private.is_tenant_owner(((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "dono substitui logos do tenant" ON storage.objects;
CREATE POLICY "dono substitui logos do tenant"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'tenant-logos' AND private.is_tenant_owner(((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id = 'tenant-logos' AND private.is_tenant_owner(((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "dono remove logos do tenant" ON storage.objects;
CREATE POLICY "dono remove logos do tenant"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tenant-logos' AND private.is_tenant_owner(((storage.foldername(name))[1])::uuid));

DROP FUNCTION public.is_tenant_owner(uuid);