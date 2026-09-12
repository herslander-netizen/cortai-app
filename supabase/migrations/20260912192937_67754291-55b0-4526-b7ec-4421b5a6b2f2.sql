CREATE OR REPLACE FUNCTION public.is_tenant_owner(_tenant_id uuid)
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

REVOKE ALL ON FUNCTION public.is_tenant_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "membros atualizam seu tenant" ON public.tenants;
CREATE POLICY "dono atualiza marca e dados do tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (public.is_tenant_owner(id))
WITH CHECK (public.is_tenant_owner(id));

CREATE TABLE public.tenant_branding_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  snapshot jsonb NOT NULL,
  restaurado_de uuid REFERENCES public.tenant_branding_versions(id) ON DELETE SET NULL,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, versao)
);
GRANT SELECT, INSERT ON public.tenant_branding_versions TO authenticated;
GRANT ALL ON public.tenant_branding_versions TO service_role;
ALTER TABLE public.tenant_branding_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dono le historico da marca"
ON public.tenant_branding_versions
FOR SELECT
TO authenticated
USING (public.is_tenant_owner(tenant_id));
CREATE POLICY "dono cria versao da marca"
ON public.tenant_branding_versions
FOR INSERT
TO authenticated
WITH CHECK (public.is_tenant_owner(tenant_id) AND criado_por = auth.uid());

CREATE INDEX tenant_branding_versions_tenant_criado_idx
ON public.tenant_branding_versions (tenant_id, criado_em DESC);

CREATE POLICY "dono le logos do tenant"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "dono envia logos do tenant"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "dono substitui logos do tenant"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'tenant-logos'
  AND public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
);
CREATE POLICY "dono remove logos do tenant"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-logos'
  AND public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
);