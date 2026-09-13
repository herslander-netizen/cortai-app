DROP POLICY IF EXISTS "publico le somente base visual" ON public.configuracoes_da_plataforma;

CREATE OR REPLACE FUNCTION public.configuracao_visual_global()
 RETURNS TABLE(cor_fundo text, cor_superficie text, cor_primaria text, cor_texto text, tipografia text, raio_px integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.cor_fundo, c.cor_superficie, c.cor_primaria, c.cor_texto, c.tipografia, c.raio_px
  FROM public.configuracoes_da_plataforma c
  WHERE c.id = true
$function$;

CREATE OR REPLACE FUNCTION public.contato_da_plataforma()
 RETURNS TABLE(whatsapp_alvo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.whatsapp_alvo FROM public.configuracoes_da_plataforma c WHERE c.id = true
$function$;

REVOKE ALL ON FUNCTION public.configuracao_visual_global() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contato_da_plataforma() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configuracao_visual_global() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.contato_da_plataforma() TO anon, authenticated, service_role;