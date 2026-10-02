ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plano_escolhido text,
  ADD COLUMN IF NOT EXISTS teste_negado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avisos_teste_enviados integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS envios_auto_mes text,
  ADD COLUMN IF NOT EXISTS envios_auto_qtd integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS envios_auto_aviso80 boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.testes_usados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  hash text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, hash)
);
GRANT ALL ON public.testes_usados TO service_role;
ALTER TABLE public.testes_usados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Somente servidor" ON public.testes_usados FOR SELECT TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.recurso_do_tenant_ativo(_tenant_id uuid, _chave text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT ativo FROM public.recursos_do_tenant WHERE tenant_id = _tenant_id AND chave = _chave), true)
     AND COALESCE((SELECT rp.liberado FROM public.recursos_de_plano rp
                   JOIN public.tenants t
                     ON rp.plano = CASE WHEN t.assinatura_status = 'teste' AND t.teste_fim >= now() THEN 'studio' ELSE t.plano END
                   WHERE t.id = _tenant_id AND rp.chave = _chave), true);
$function$;