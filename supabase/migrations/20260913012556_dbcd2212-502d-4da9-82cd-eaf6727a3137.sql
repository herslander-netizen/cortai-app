CREATE TABLE IF NOT EXISTS public.recursos_do_tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  chave text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chave)
);

GRANT SELECT, INSERT, UPDATE ON public.recursos_do_tenant TO authenticated;
GRANT ALL ON public.recursos_do_tenant TO service_role;
GRANT SELECT ON public.recursos_do_tenant TO anon;

ALTER TABLE public.recursos_do_tenant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recursos_do_tenant_leitura_publica" ON public.recursos_do_tenant
  FOR SELECT USING (true);

CREATE POLICY "recursos_do_tenant_inserir" ON public.recursos_do_tenant
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));

CREATE POLICY "recursos_do_tenant_atualizar" ON public.recursos_do_tenant
  FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));

CREATE INDEX IF NOT EXISTS recursos_do_tenant_tenant_idx ON public.recursos_do_tenant (tenant_id);

CREATE TRIGGER recursos_do_tenant_atualizado_em
  BEFORE UPDATE ON public.recursos_do_tenant
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

CREATE OR REPLACE FUNCTION public.recurso_do_tenant_ativo(_tenant_id uuid, _chave text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT ativo FROM public.recursos_do_tenant WHERE tenant_id = _tenant_id AND chave = _chave), true);
$$;

REVOKE ALL ON FUNCTION public.recurso_do_tenant_ativo(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recurso_do_tenant_ativo(uuid, text) TO authenticated, anon, service_role;