ALTER VIEW public.design_da_plataforma SET (security_invoker = true);

GRANT SELECT (id, cor_fundo, cor_superficie, cor_primaria, cor_texto, tipografia, raio_px)
ON public.configuracoes_da_plataforma TO anon;

CREATE POLICY "publico le somente base visual"
ON public.configuracoes_da_plataforma
FOR SELECT
TO anon
USING (id = true);