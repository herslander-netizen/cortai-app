-- Reconstrução fora do Lovable: peças que existem no banco original, mas que nenhuma
-- migração do repositório cria. Sem elas, a sequência para em migrações seguintes.
-- Roda logo depois da migração inicial e não faz nada num banco que já tenha estas peças.
--
-- Origem: estrutura e tipos de src/integrations/supabase/types.ts (gerado a partir do banco
-- original). Regras de acesso e índices foram DEDUZIDOS do uso no código: toda gravação
-- nestas tabelas acontece no servidor (service_role). Revisar antes de aplicar em produção.
-- Os nomes legados (com "barbearia") ficam como estão porque o código os usa; a troca
-- para nomes neutros é uma etapa separada.

-- Usada pela migração 20260913144719 (permissões por papel).
ALTER TABLE public.tenant_usuarios ADD COLUMN IF NOT EXISTS permissoes text[] NOT NULL DEFAULT '{}';

-- A migração inicial cria esta restrição sem 'gerente', e a 20260913144719 só a recria se
-- ela não existir. No banco original ela aceita 'gerente' (ver supabase/tests/rbac.sql).
ALTER TABLE public.tenant_usuarios DROP CONSTRAINT IF EXISTS tenant_usuarios_papel_check;
ALTER TABLE public.tenant_usuarios ADD CONSTRAINT tenant_usuarios_papel_check
  CHECK (papel IN ('dono', 'gerente', 'barbeiro', 'recepcao'));

-- Usada pela política de agendamentos da migração 20260913160518.
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS pagamento_confirmado_por uuid;

-- Histórico de ações do negócio. Gravado por funções do banco e pelo servidor.
CREATE TABLE IF NOT EXISTS public.auditoria_da_barbearia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ator_user_id uuid,
  acao text NOT NULL,
  alvo text NOT NULL DEFAULT '',
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_da_barbearia_tenant_criado_idx
  ON public.auditoria_da_barbearia (tenant_id, criado_em DESC);
ALTER TABLE public.auditoria_da_barbearia ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auditoria_da_barbearia FROM anon, authenticated;
GRANT SELECT ON public.auditoria_da_barbearia TO authenticated;
GRANT ALL ON public.auditoria_da_barbearia TO service_role;

-- Interruptores de funcionalidade por negócio. Gravados só pelo servidor.
CREATE TABLE IF NOT EXISTS public.recursos_do_tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  chave text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, chave)
);
ALTER TABLE public.recursos_do_tenant ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recursos_do_tenant FROM anon, authenticated;
GRANT SELECT ON public.recursos_do_tenant TO authenticated;
GRANT ALL ON public.recursos_do_tenant TO service_role;

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
