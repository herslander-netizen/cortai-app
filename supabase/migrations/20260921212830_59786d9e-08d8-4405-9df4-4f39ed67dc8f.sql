ALTER TABLE public.config_atendimento_ia
  ADD COLUMN IF NOT EXISTS confirmacao_automatica boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pagamento_antecipado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_pagamento text NOT NULL DEFAULT '';

CREATE TABLE public.envios_de_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefone text NOT NULL,
  tipo text NOT NULL DEFAULT 'confirmacao_agendamento',
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviando','enviado','erro')),
  tentativas integer NOT NULL DEFAULT 0,
  conteudo text,
  erro text,
  enviado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX envios_de_whatsapp_unico_por_evento
  ON public.envios_de_whatsapp (agendamento_id, tipo)
  WHERE agendamento_id IS NOT NULL;

CREATE INDEX envios_de_whatsapp_tenant_idx ON public.envios_de_whatsapp (tenant_id, criado_em DESC);

GRANT SELECT ON public.envios_de_whatsapp TO authenticated;
GRANT ALL ON public.envios_de_whatsapp TO service_role;

ALTER TABLE public.envios_de_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe da barbearia ve os envios"
  ON public.envios_de_whatsapp FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE TRIGGER envios_de_whatsapp_atualizado_em
  BEFORE UPDATE ON public.envios_de_whatsapp
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();