CREATE TABLE public.postagens_sociais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plataforma text NOT NULL CHECK (plataforma IN ('instagram','tiktok')),
  legenda text NOT NULL DEFAULT '',
  midia_url text NOT NULL,
  agendado_para timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','publicando','publicada','falha','cancelada')),
  simulada boolean NOT NULL DEFAULT false,
  id_externo text,
  erro text,
  tentativas integer NOT NULL DEFAULT 0,
  publicado_em timestamptz,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX postagens_sociais_fila ON public.postagens_sociais (status, agendado_para);
CREATE INDEX postagens_sociais_tenant ON public.postagens_sociais (tenant_id, agendado_para DESC);

GRANT SELECT ON public.postagens_sociais TO authenticated;
GRANT ALL ON public.postagens_sociais TO service_role;
ALTER TABLE public.postagens_sociais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros leem postagens do negocio" ON public.postagens_sociais
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

CREATE TRIGGER postagens_sociais_atualizado_em BEFORE UPDATE ON public.postagens_sociais
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();