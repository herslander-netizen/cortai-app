DROP VIEW IF EXISTS public.configuracao_visual_publica;

GRANT SELECT (cor_fundo, cor_superficie, cor_primaria, cor_texto, tipografia, raio_px, id) ON public.configuracoes_da_plataforma TO anon;

CREATE POLICY "publico le somente base visual"
ON public.configuracoes_da_plataforma
FOR SELECT
TO anon
USING (id = true);