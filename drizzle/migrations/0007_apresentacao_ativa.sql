ALTER TABLE public.home_publica
  ADD COLUMN IF NOT EXISTS apresentacao_ativa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apresentacao_alterada_em timestamptz,
  ADD COLUMN IF NOT EXISTS apresentacao_alterada_por uuid;