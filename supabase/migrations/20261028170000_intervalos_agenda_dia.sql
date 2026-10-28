CREATE TABLE IF NOT EXISTS public.intervalos_agenda_dia (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dia date NOT NULL,
  intervalo_inicio time without time zone NOT NULL,
  intervalo_fim time without time zone NOT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intervalos_agenda_dia_pk PRIMARY KEY (tenant_id, dia),
  CONSTRAINT intervalos_agenda_dia_horario_distinto CHECK (intervalo_inicio <> intervalo_fim)
);
CREATE INDEX IF NOT EXISTS intervalos_agenda_dia_dia_idx
  ON public.intervalos_agenda_dia (tenant_id, dia);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intervalos_agenda_dia TO authenticated;
GRANT ALL ON public.intervalos_agenda_dia TO service_role;
ALTER TABLE public.intervalos_agenda_dia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "membros leem intervalos por data" ON public.intervalos_agenda_dia;
CREATE POLICY "membros leem intervalos por data"
  ON public.intervalos_agenda_dia FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
DROP POLICY IF EXISTS "membros criam intervalos por data" ON public.intervalos_agenda_dia;
CREATE POLICY "membros criam intervalos por data"
  ON public.intervalos_agenda_dia FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));
DROP POLICY IF EXISTS "membros atualizam intervalos por data" ON public.intervalos_agenda_dia;
CREATE POLICY "membros atualizam intervalos por data"
  ON public.intervalos_agenda_dia FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));
DROP POLICY IF EXISTS "membros removem intervalos por data" ON public.intervalos_agenda_dia;
CREATE POLICY "membros removem intervalos por data"
  ON public.intervalos_agenda_dia FOR DELETE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));
