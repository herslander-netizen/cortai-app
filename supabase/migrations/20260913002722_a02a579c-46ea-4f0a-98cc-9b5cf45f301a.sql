ALTER TABLE public.configuracoes_da_plataforma ADD COLUMN IF NOT EXISTS whatsapp_alvo text;

CREATE OR REPLACE FUNCTION public.contato_da_plataforma()
RETURNS TABLE(whatsapp_alvo text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT c.whatsapp_alvo FROM public.configuracoes_da_plataforma c WHERE c.id = true
$$;

GRANT EXECUTE ON FUNCTION public.contato_da_plataforma() TO anon, authenticated;