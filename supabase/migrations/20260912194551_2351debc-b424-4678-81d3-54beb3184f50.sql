DROP POLICY IF EXISTS "todos leem configuracao visual global" ON public.configuracoes_da_plataforma;
REVOKE ALL ON public.configuracoes_da_plataforma FROM anon;

CREATE OR REPLACE VIEW public.design_da_plataforma
WITH (security_barrier = true)
AS
SELECT id, cor_fundo, cor_superficie, cor_primaria, cor_texto, tipografia, raio_px
FROM public.configuracoes_da_plataforma;

REVOKE ALL ON public.design_da_plataforma FROM PUBLIC;
GRANT SELECT ON public.design_da_plataforma TO anon, authenticated;
GRANT ALL ON public.design_da_plataforma TO service_role;