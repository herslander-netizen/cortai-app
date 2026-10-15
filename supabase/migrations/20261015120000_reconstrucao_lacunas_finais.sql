-- Reconstrução fora do Lovable: peças do banco original que nenhuma migração cria e que
-- dependem de funções criadas mais adiante na sequência. Roda depois das migrações Supabase
-- e Drizzle e não faz nada num banco que já tenha estas peças.
-- Estrutura e assinaturas: src/integrations/supabase/types.ts. Regras de acesso, corpo da
-- função e configuração dos buckets: DEDUZIDOS do código e de docs/auditoria-2026-10-09.md.
-- Revisar antes de aplicar em produção.

-- Redes sociais da plataforma (lidas pela vitrine pública).
ALTER TABLE public.configuracoes_da_plataforma
  ADD COLUMN IF NOT EXISTS facebook_cortai text,
  ADD COLUMN IF NOT EXISTS instagram_cortai text,
  ADD COLUMN IF NOT EXISTS tiktok_cortai text,
  ADD COLUMN IF NOT EXISTS youtube_cortai text;

ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS pagamento_confirmado_em timestamptz;

-- Quem lê o histórico do negócio: quem tem a permissão de relatórios (o dono sempre tem).
DROP POLICY IF EXISTS "membro com relatorios le auditoria" ON public.auditoria_da_barbearia;
CREATE POLICY "membro com relatorios le auditoria" ON public.auditoria_da_barbearia
  FOR SELECT TO authenticated USING (public.has_tenant_permission(tenant_id, 'relatorios'));

DROP POLICY IF EXISTS "membro le recursos do negocio" ON public.recursos_do_tenant;
CREATE POLICY "membro le recursos do negocio" ON public.recursos_do_tenant
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

-- Registra uma ação em nome de quem chama, só dentro do próprio negócio. Chamadas sem
-- usuário (servidor ou gatilhos) registram sem ator.
CREATE OR REPLACE FUNCTION public.registrar_auditoria_barbearia(
  _tenant_id uuid,
  _acao text,
  _alvo text,
  _detalhes jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_tenant_member(_tenant_id) THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
  INSERT INTO public.auditoria_da_barbearia (tenant_id, ator_user_id, acao, alvo, detalhes)
  VALUES (_tenant_id, auth.uid(), _acao, COALESCE(_alvo, ''), COALESCE(_detalhes, '{}'::jsonb));
END
$$;
REVOKE ALL ON FUNCTION public.registrar_auditoria_barbearia(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria_barbearia(uuid, text, text, jsonb) TO authenticated, service_role;

-- Buckets citados pelas políticas de storage, mas nunca criados por migração.
-- Privados, como registrado na auditoria de 09/10/2026.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', false), ('home-publica', 'home-publica', false)
ON CONFLICT (id) DO NOTHING;
