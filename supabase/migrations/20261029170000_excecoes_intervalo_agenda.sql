-- Exceções de intervalo por data. Não altera os horários semanais.
CREATE TABLE IF NOT EXISTS public.excecoes_intervalo_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dia date NOT NULL,
  intervalo_inicio time NULL,
  intervalo_fim time NULL,
  atualizado_por uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT excecoes_intervalo_agenda_tenant_dia_key UNIQUE (tenant_id, dia),
  CONSTRAINT excecoes_intervalo_agenda_intervalo_par_check
    CHECK ((intervalo_inicio IS NULL) = (intervalo_fim IS NULL))
);

COMMENT ON TABLE public.excecoes_intervalo_agenda IS
  'Substitui apenas o intervalo do horário semanal para uma data local específica; ambos os horários nulos removem a pausa somente naquele dia.';

ALTER TABLE public.excecoes_intervalo_agenda ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.excecoes_intervalo_agenda FROM anon, authenticated;
GRANT SELECT ON public.excecoes_intervalo_agenda TO authenticated;
GRANT ALL ON public.excecoes_intervalo_agenda TO service_role;

DROP POLICY IF EXISTS "membro consulta excecoes de intervalo" ON public.excecoes_intervalo_agenda;
CREATE POLICY "membro consulta excecoes de intervalo"
  ON public.excecoes_intervalo_agenda
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP TRIGGER IF EXISTS excecoes_intervalo_agenda_atualizado_em ON public.excecoes_intervalo_agenda;
CREATE TRIGGER excecoes_intervalo_agenda_atualizado_em
  BEFORE UPDATE ON public.excecoes_intervalo_agenda
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();
