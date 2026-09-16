ALTER TABLE public.config_atendimento_ia
  ADD COLUMN IF NOT EXISTS responder_whatsapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS instrucoes_extras text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS horario_proprio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS horario_dias smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  ADD COLUMN IF NOT EXISTS horario_inicio time NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS horario_fim time NOT NULL DEFAULT '19:00';