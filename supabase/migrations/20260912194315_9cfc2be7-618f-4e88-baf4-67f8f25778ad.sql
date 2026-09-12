GRANT SELECT ON public.configuracoes_da_plataforma TO anon;
CREATE POLICY "todos leem configuracao visual global"
ON public.configuracoes_da_plataforma FOR SELECT TO anon
USING (true);

CREATE OR REPLACE FUNCTION public.configuracao_visual_global()
RETURNS TABLE (
  cor_fundo text,
  cor_superficie text,
  cor_primaria text,
  cor_texto text,
  tipografia text,
  raio_px integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.cor_fundo, c.cor_superficie, c.cor_primaria, c.cor_texto, c.tipografia, c.raio_px
  FROM public.configuracoes_da_plataforma c
  WHERE c.id = true
$$;
REVOKE ALL ON FUNCTION public.configuracao_visual_global() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configuracao_visual_global() TO anon, authenticated;