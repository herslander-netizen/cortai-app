CREATE TABLE public.bloqueios_de_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id uuid REFERENCES public.profissionais(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  motivo text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bloqueio_intervalo_valido CHECK (fim > inicio),
  CONSTRAINT bloqueio_motivo_tamanho CHECK (motivo IS NULL OR char_length(motivo) <= 120)
);
CREATE INDEX bloqueios_de_agenda_tenant_inicio ON public.bloqueios_de_agenda (tenant_id, inicio);
GRANT SELECT, INSERT, DELETE ON public.bloqueios_de_agenda TO authenticated;
GRANT ALL ON public.bloqueios_de_agenda TO service_role;
ALTER TABLE public.bloqueios_de_agenda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros veem bloqueios" ON public.bloqueios_de_agenda FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Membros criam bloqueios" ON public.bloqueios_de_agenda FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id));
CREATE POLICY "Membros removem bloqueios" ON public.bloqueios_de_agenda FOR DELETE TO authenticated USING (public.is_tenant_member(tenant_id));

CREATE TABLE public.escalas_de_profissional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profissional_id uuid NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  trabalha boolean NOT NULL DEFAULT true,
  abre time,
  fecha time,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profissional_id, dia_semana)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escalas_de_profissional TO authenticated;
GRANT ALL ON public.escalas_de_profissional TO service_role;
ALTER TABLE public.escalas_de_profissional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros veem escalas" ON public.escalas_de_profissional FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "Membros gerenciam escalas" ON public.escalas_de_profissional FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));