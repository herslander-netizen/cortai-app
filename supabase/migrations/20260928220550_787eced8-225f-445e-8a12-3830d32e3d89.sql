-- lovable-cron-fallback-reviewed: reconciliação de cobranças perdidas, fim de teste e tolerância por data, pedido explícito a cada 30 min
ALTER TABLE public.configuracoes_da_plataforma
  ADD COLUMN IF NOT EXISTS cobranca_ligada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tolerancia_dias integer NOT NULL DEFAULT 7 CHECK (tolerancia_dias BETWEEN 0 AND 60),
  ADD COLUMN IF NOT EXISTS plano_inicial text NOT NULL DEFAULT 'essencial';
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS cobrancas_com_desconto integer DEFAULT 1 CHECK (cobrancas_com_desconto IS NULL OR cobrancas_com_desconto >= 1);

CREATE TABLE public.dados_de_cobranca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf_cnpj text NOT NULL CHECK (cpf_cnpj ~ '^[0-9]{11}$|^[0-9]{14}$'),
  email text NOT NULL,
  telefone text,
  asaas_customer_id text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  asaas_subscription_id text UNIQUE,
  plano_chave text NOT NULL,
  ciclo text NOT NULL DEFAULT 'mensal' CHECK (ciclo IN ('mensal','anual')),
  forma text CHECK (forma IN ('pix','boleto','cartao')),
  valor_centavos integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('teste','aguardando_pagamento','ativa','pendente','suspensa','cancelada','cortesia')),
  proximo_vencimento date,
  pago_ate date,
  cupom_id uuid REFERENCES public.cupons(id) ON DELETE SET NULL,
  cobrancas_com_desconto_restantes integer,
  cancelar_no_fim boolean NOT NULL DEFAULT false,
  plano_agendado text,
  ciclo_agendado text CHECK (ciclo_agendado IN ('mensal','anual')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_payment_id text NOT NULL UNIQUE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assinatura_id uuid REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  valor_centavos integer NOT NULL DEFAULT 0,
  liquido_centavos integer,
  status text NOT NULL,
  vencimento date,
  pago_em timestamptz,
  forma text,
  link_pagamento text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX faturas_tenant_idx ON public.faturas(tenant_id, vencimento DESC);
CREATE TABLE public.eventos_asaas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  evento text NOT NULL,
  payment_id text,
  corpo jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido','processado','erro')),
  erro text,
  tentativas integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dados_de_cobranca, public.assinaturas, public.faturas TO authenticated;
GRANT ALL ON public.dados_de_cobranca, public.assinaturas, public.faturas, public.eventos_asaas TO service_role;
REVOKE ALL ON public.eventos_asaas FROM anon, authenticated;

ALTER TABLE public.dados_de_cobranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_asaas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dono ou admin leem dados de cobranca" ON public.dados_de_cobranca FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_tenant_permission(tenant_id,'gerenciar_plano'));
CREATE POLICY "Dono ou admin leem assinatura" ON public.assinaturas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_tenant_permission(tenant_id,'gerenciar_plano'));
CREATE POLICY "Dono ou admin leem faturas" ON public.faturas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_tenant_permission(tenant_id,'gerenciar_plano'));
CREATE POLICY "Somente servidor" ON public.eventos_asaas FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER dados_de_cobranca_atualizado BEFORE UPDATE ON public.dados_de_cobranca FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();
CREATE TRIGGER assinaturas_atualizado BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

INSERT INTO public.chaves_internas (nome, valor)
VALUES ('varredura_asaas', encode(extensions.gen_random_bytes(32),'hex'))
ON CONFLICT (nome) DO NOTHING;

SELECT cron.schedule('cortai-varredura-asaas', '*/30 * * * *', $cmd$
  SELECT net.http_post(
    url := 'https://cortai.dev/api/public/asaas/varredura',
    headers := jsonb_build_object('Content-Type','application/json','x-cortai-varredura',(SELECT valor FROM public.chaves_internas WHERE nome='varredura_asaas')),
    body := '{}'::jsonb
  );
$cmd$);