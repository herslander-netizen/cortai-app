ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS contexto_ativo text;
ALTER TABLE public.perfis DROP CONSTRAINT IF EXISTS perfis_contexto_ativo_valido;
ALTER TABLE public.perfis ADD CONSTRAINT perfis_contexto_ativo_valido CHECK (contexto_ativo IS NULL OR contexto_ativo IN ('cliente', 'negocio'));
COMMENT ON COLUMN public.perfis.contexto_ativo IS 'Último contexto escolhido pela conta (cliente ou negocio); null = ainda não escolheu.';