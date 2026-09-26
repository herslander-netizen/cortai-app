ALTER TABLE public.config_atendimento_ia
  ADD COLUMN IF NOT EXISTS textos_conversa jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS situacoes_desligadas text[] NOT NULL DEFAULT '{}'::text[];