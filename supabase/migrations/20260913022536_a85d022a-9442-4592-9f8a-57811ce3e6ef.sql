ALTER TABLE public.configuracoes_da_plataforma
  ADD COLUMN IF NOT EXISTS instagram_cortai text,
  ADD COLUMN IF NOT EXISTS facebook_cortai text,
  ADD COLUMN IF NOT EXISTS tiktok_cortai text,
  ADD COLUMN IF NOT EXISTS youtube_cortai text;

DROP FUNCTION IF EXISTS public.contato_da_plataforma();

CREATE FUNCTION public.contato_da_plataforma()
RETURNS TABLE(
  whatsapp_alvo text,
  instagram_cortai text,
  facebook_cortai text,
  tiktok_cortai text,
  youtube_cortai text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.whatsapp_alvo,
    c.instagram_cortai,
    c.facebook_cortai,
    c.tiktok_cortai,
    c.youtube_cortai
  FROM public.configuracoes_da_plataforma c
  WHERE c.id = true
$$;

REVOKE ALL ON FUNCTION public.contato_da_plataforma() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contato_da_plataforma() TO anon, authenticated, service_role;