-- Integração com a futura plataforma ALVO IA
CREATE TABLE public.integracoes_de_ia (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provedor text NOT NULL DEFAULT 'alvo_ia',
  status text NOT NULL DEFAULT 'desconectado',
  external_tenant_id text,
  external_agent_id text,
  agent_name text,
  agent_persona jsonb NOT NULL DEFAULT '{}'::jsonb,
  conectado_em timestamptz,
  ultima_sincronizacao_em timestamptz,
  ultimo_erro text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integracoes_de_ia_provedor_ck CHECK (provedor IN ('alvo_ia')),
  CONSTRAINT integracoes_de_ia_status_ck CHECK (status IN ('desconectado','pendente','conectado','erro','suspenso')),
  CONSTRAINT integracoes_de_ia_tenant_provedor_uk UNIQUE (tenant_id, provedor)
);
CREATE UNIQUE INDEX integracoes_de_ia_externo_uk
  ON public.integracoes_de_ia (provedor, external_tenant_id)
  WHERE external_tenant_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.integracoes_de_ia TO authenticated;
GRANT ALL ON public.integracoes_de_ia TO service_role;
ALTER TABLE public.integracoes_de_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros veem a integracao da propria barbearia"
  ON public.integracoes_de_ia FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
CREATE POLICY "gestores criam a integracao da propria barbearia"
  ON public.integracoes_de_ia FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));
CREATE POLICY "gestores editam a integracao da propria barbearia"
  ON public.integracoes_de_ia FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));

CREATE TRIGGER integracoes_de_ia_atualizado_em
  BEFORE UPDATE ON public.integracoes_de_ia
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

-- Fila de eventos de negócio (saída)
CREATE TABLE public.eventos_de_ia (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provedor text NOT NULL DEFAULT 'alvo_ia',
  tipo text NOT NULL,
  chave_idempotencia text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  tentativas integer NOT NULL DEFAULT 0,
  ultimo_erro text,
  processado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_de_ia_status_ck CHECK (status IN ('pendente','enviado','falha','descartado')),
  CONSTRAINT eventos_de_ia_idempotencia_uk UNIQUE (tenant_id, provedor, chave_idempotencia)
);
CREATE INDEX eventos_de_ia_pendentes_idx ON public.eventos_de_ia (tenant_id, status, criado_em);

GRANT SELECT ON public.eventos_de_ia TO authenticated;
GRANT ALL ON public.eventos_de_ia TO service_role;
ALTER TABLE public.eventos_de_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros veem os eventos da propria barbearia"
  ON public.eventos_de_ia FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

-- Eventos recebidos da plataforma (entrada)
CREATE TABLE public.eventos_recebidos_de_ia (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provedor text NOT NULL DEFAULT 'alvo_ia',
  evento_externo_id text NOT NULL,
  tipo text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'recebido',
  erro text,
  processado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_recebidos_de_ia_status_ck CHECK (status IN ('recebido','processado','ignorado','falha')),
  CONSTRAINT eventos_recebidos_de_ia_uk UNIQUE (tenant_id, provedor, evento_externo_id)
);

GRANT SELECT ON public.eventos_recebidos_de_ia TO authenticated;
GRANT ALL ON public.eventos_recebidos_de_ia TO service_role;
ALTER TABLE public.eventos_recebidos_de_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros veem os eventos recebidos da propria barbearia"
  ON public.eventos_recebidos_de_ia FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));