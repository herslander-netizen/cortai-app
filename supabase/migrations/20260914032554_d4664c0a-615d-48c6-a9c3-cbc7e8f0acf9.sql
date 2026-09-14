ALTER TABLE public.integracoes_de_ia
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS token_prefixo text,
  ADD COLUMN IF NOT EXISTS token_criado_em timestamptz,
  ADD COLUMN IF NOT EXISTS token_usado_em timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS integracoes_de_ia_token_hash_idx
  ON public.integracoes_de_ia (token_hash) WHERE token_hash IS NOT NULL;