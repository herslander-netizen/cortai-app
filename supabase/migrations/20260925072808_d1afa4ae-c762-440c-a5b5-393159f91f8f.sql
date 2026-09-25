ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS profissional_ids uuid[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.servicos.profissional_ids IS 'Vazio = todos os profissionais fazem o serviço.';

ALTER TABLE public.horarios_de_funcionamento
  ADD COLUMN IF NOT EXISTS intervalo_inicio time,
  ADD COLUMN IF NOT EXISTS intervalo_fim time;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS antecedencia_min_minutos integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS cancelamento_min_horas integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS intervalo_entre_min integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aceita_encaixe boolean NOT NULL DEFAULT true;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_regras_faixa CHECK (
    antecedencia_min_minutos BETWEEN 0 AND 10080
    AND cancelamento_min_horas BETWEEN 0 AND 168
    AND intervalo_entre_min BETWEEN 0 AND 120
  );