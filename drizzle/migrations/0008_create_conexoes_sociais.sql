CREATE TABLE public.conexoes_sociais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plataforma text NOT NULL,
  status text NOT NULL DEFAULT 'simulada',
  conta_nome text,
  conta_id_externo text,
  avatar_url text,
  token_acesso text,
  token_refresh text,
  expira_em timestamptz,
  conectado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, plataforma)
);

-- Leitura para membros só das colunas seguras; tokens ficam restritos ao service_role.
GRANT SELECT (id, tenant_id, plataforma, status, conta_nome, conta_id_externo, avatar_url, expira_em, criado_em, atualizado_em) ON public.conexoes_sociais TO authenticated;
GRANT ALL ON public.conexoes_sociais TO service_role;

ALTER TABLE public.conexoes_sociais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros leem conexoes do negocio"
  ON public.conexoes_sociais FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE TRIGGER conexoes_sociais_atualizado_em
  BEFORE UPDATE ON public.conexoes_sociais
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();