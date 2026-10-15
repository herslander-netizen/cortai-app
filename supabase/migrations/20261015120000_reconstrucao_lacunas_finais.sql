-- Reconstrução fora do Lovable: peças do banco original que nenhuma migração conhecida cria
-- (nem as do repositório nem as recuperadas do export de 13/09/2026). Não faz nada num banco
-- que já tenha estas peças.
-- Estrutura: src/integrations/supabase/types.ts. Regras de acesso e configuração dos buckets:
-- DEDUZIDOS do código e de docs/auditoria-2026-10-09.md. Revisar antes de aplicar em produção.

-- Aceite de termos por usuário. Cada pessoa vê e registra só os próprios aceites.
CREATE TABLE IF NOT EXISTS public.aceites_legais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documento text NOT NULL,
  versao text NOT NULL,
  aceito boolean NOT NULL DEFAULT true,
  origem text NOT NULL DEFAULT 'app',
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aceites_legais ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aceites_legais FROM anon, authenticated;
GRANT SELECT, INSERT ON public.aceites_legais TO authenticated;
GRANT ALL ON public.aceites_legais TO service_role;
DROP POLICY IF EXISTS "usuario le os proprios aceites" ON public.aceites_legais;
CREATE POLICY "usuario le os proprios aceites" ON public.aceites_legais
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "usuario registra o proprio aceite" ON public.aceites_legais;
CREATE POLICY "usuario registra o proprio aceite" ON public.aceites_legais
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Buckets citados pelas políticas de storage, mas nunca criados por migração.
-- Privados, como registrado na auditoria de 09/10/2026.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', false), ('home-publica', 'home-publica', false)
ON CONFLICT (id) DO NOTHING;
