DROP POLICY IF EXISTS "publico le somente base visual" ON public.configuracoes_da_plataforma;
REVOKE ALL ON public.configuracoes_da_plataforma FROM anon;

CREATE OR REPLACE VIEW public.configuracao_visual_publica
WITH (security_invoker = false) AS
SELECT c.cor_fundo, c.cor_superficie, c.cor_primaria, c.cor_texto, c.tipografia, c.raio_px
FROM public.configuracoes_da_plataforma c
WHERE c.id = true;

GRANT SELECT ON public.configuracao_visual_publica TO anon, authenticated;