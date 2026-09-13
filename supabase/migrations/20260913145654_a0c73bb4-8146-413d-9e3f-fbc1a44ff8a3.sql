-- 1. PLANOS
CREATE TABLE public.planos_da_plataforma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  preco_mensal_centavos integer NOT NULL DEFAULT 0 CHECK (preco_mensal_centavos >= 0),
  preco_anual_centavos integer NOT NULL DEFAULT 0 CHECK (preco_anual_centavos >= 0),
  dias_teste integer NOT NULL DEFAULT 0 CHECK (dias_teste >= 0),
  limite_profissionais integer,
  limite_clientes integer,
  limite_agendamentos_mes integer,
  limite_unidades integer,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.planos_da_plataforma TO authenticated;
GRANT ALL ON public.planos_da_plataforma TO service_role;
ALTER TABLE public.planos_da_plataforma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos visiveis para logados" ON public.planos_da_plataforma
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "somente admin altera planos" ON public.planos_da_plataforma
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER planos_atualizado_em BEFORE UPDATE ON public.planos_da_plataforma
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

INSERT INTO public.planos_da_plataforma (chave, nome, descricao, preco_mensal_centavos, preco_anual_centavos, dias_teste, ordem)
SELECT 'essencial', 'Essencial', 'O básico para colocar a barbearia no controle.',
       c.preco_essencial_centavos, c.preco_essencial_centavos * 10, 0, 1
FROM public.configuracoes_da_plataforma c WHERE c.id = true;
INSERT INTO public.planos_da_plataforma (chave, nome, descricao, preco_mensal_centavos, preco_anual_centavos, dias_teste, ordem)
SELECT 'pro', 'Pro', 'Gestão completa do dia a dia da barbearia.',
       c.preco_pro_centavos, c.preco_pro_centavos * 10, 0, 2
FROM public.configuracoes_da_plataforma c WHERE c.id = true;
INSERT INTO public.planos_da_plataforma (chave, nome, descricao, preco_mensal_centavos, preco_anual_centavos, dias_teste, ordem)
SELECT 'studio', 'Studio', 'Para quem quer tudo do Cortaí liberado.',
       c.preco_studio_centavos, c.preco_studio_centavos * 10, 0, 3
FROM public.configuracoes_da_plataforma c WHERE c.id = true;

-- 2. CONDIÇÕES COMERCIAIS POR BARBEARIA
CREATE TABLE public.condicoes_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plano_chave text NOT NULL,
  preco_personalizado_centavos integer CHECK (preco_personalizado_centavos IS NULL OR preco_personalizado_centavos >= 0),
  desconto_percentual integer NOT NULL DEFAULT 0 CHECK (desconto_percentual BETWEEN 0 AND 100),
  desconto_centavos integer NOT NULL DEFAULT 0 CHECK (desconto_centavos >= 0),
  ciclo text NOT NULL DEFAULT 'mensal' CHECK (ciclo IN ('mensal','anual')),
  inicio date NOT NULL DEFAULT current_date,
  fim date,
  motivo text,
  limites jsonb NOT NULL DEFAULT '{}'::jsonb,
  recursos text[] NOT NULL DEFAULT '{}'::text[],
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX condicoes_comerciais_tenant_idx ON public.condicoes_comerciais (tenant_id, ativo);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condicoes_comerciais TO authenticated;
GRANT ALL ON public.condicoes_comerciais TO service_role;
ALTER TABLE public.condicoes_comerciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "somente admin gerencia condicoes" ON public.condicoes_comerciais
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER condicoes_atualizado_em BEFORE UPDATE ON public.condicoes_comerciais
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

-- 3. CUPONS
CREATE TABLE public.cupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text,
  tipo text NOT NULL DEFAULT 'percentual' CHECK (tipo IN ('percentual','fixo')),
  valor integer NOT NULL CHECK (valor >= 0),
  inicio date NOT NULL DEFAULT current_date,
  fim date,
  usos_max integer CHECK (usos_max IS NULL OR usos_max > 0),
  usos integer NOT NULL DEFAULT 0,
  publico text NOT NULL DEFAULT 'todos' CHECK (publico IN ('todos','novos','existentes')),
  planos text[] NOT NULL DEFAULT '{}'::text[],
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cupons TO authenticated;
GRANT ALL ON public.cupons TO service_role;
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "somente admin gerencia cupons" ON public.cupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cupons_atualizado_em BEFORE UPDATE ON public.cupons
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

CREATE TABLE public.cupons_usos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cupom_id uuid NOT NULL REFERENCES public.cupons(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  aplicado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cupom_id, tenant_id)
);
GRANT SELECT, INSERT ON public.cupons_usos TO authenticated;
GRANT ALL ON public.cupons_usos TO service_role;
ALTER TABLE public.cupons_usos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin ve usos de cupom" ON public.cupons_usos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "membro ve uso do proprio tenant" ON public.cupons_usos
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

-- 4. BANNERS E CAMPANHAS
CREATE TABLE public.banners_da_plataforma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  imagem_url text,
  cta_rotulo text,
  cta_destino text,
  inicio date NOT NULL DEFAULT current_date,
  fim date,
  prioridade integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  segmento text NOT NULL DEFAULT 'todos' CHECK (segmento IN ('todos','novos','teste','plano','tenant','vencimento')),
  plano_alvo text,
  tenant_alvo uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners_da_plataforma TO authenticated;
GRANT ALL ON public.banners_da_plataforma TO service_role;
ALTER TABLE public.banners_da_plataforma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "somente admin gerencia banners" ON public.banners_da_plataforma
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER banners_atualizado_em BEFORE UPDATE ON public.banners_da_plataforma
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

-- 5. ASSINATURA NA BARBEARIA
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS assinatura_status text NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS teste_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS teste_fim timestamptz;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_assinatura_status_check
  CHECK (assinatura_status IN ('teste','ativa','vencida','cancelada'));