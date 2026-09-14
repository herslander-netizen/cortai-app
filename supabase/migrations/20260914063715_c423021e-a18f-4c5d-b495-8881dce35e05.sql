-- 1. Conexões de WhatsApp por barbearia
CREATE TABLE public.conexoes_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provedor text NOT NULL DEFAULT 'gateway',
  sessao_id text NOT NULL,
  numero text,
  nome_exibicao text,
  status text NOT NULL DEFAULT 'desconectado',
  qr_code text,
  qr_expira_em timestamptz,
  conectado_em timestamptz,
  desconectado_em timestamptz,
  visto_em timestamptz,
  ultimo_erro text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conexoes_whatsapp_sessao_unica UNIQUE (sessao_id),
  CONSTRAINT conexoes_whatsapp_tenant_unico UNIQUE (tenant_id),
  CONSTRAINT conexoes_whatsapp_status_valido CHECK (status IN ('desconectado','pendente','qr_pronto','conectando','conectado','erro'))
);

GRANT SELECT ON public.conexoes_whatsapp TO authenticated;
GRANT ALL ON public.conexoes_whatsapp TO service_role;
ALTER TABLE public.conexoes_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_le_conexao_whatsapp" ON public.conexoes_whatsapp
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'ver_cortai'));

CREATE TRIGGER conexoes_whatsapp_atualizado_em
  BEFORE UPDATE ON public.conexoes_whatsapp
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();

CREATE INDEX idx_conexoes_whatsapp_tenant ON public.conexoes_whatsapp(tenant_id);

-- 2. Conversas do WhatsApp
CREATE TABLE public.conversas_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conexao_id uuid REFERENCES public.conexoes_whatsapp(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefone text NOT NULL,
  nome_contato text,
  status text NOT NULL DEFAULT 'ativa',
  ia_ativa boolean NOT NULL DEFAULT true,
  modo_humano boolean NOT NULL DEFAULT false,
  nao_lidas integer NOT NULL DEFAULT 0,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  ultima_mensagem_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversas_whatsapp_unica UNIQUE (tenant_id, telefone),
  CONSTRAINT conversas_whatsapp_status_valido CHECK (status IN ('ativa','humano','encerrada'))
);

GRANT SELECT, UPDATE ON public.conversas_whatsapp TO authenticated;
GRANT ALL ON public.conversas_whatsapp TO service_role;
ALTER TABLE public.conversas_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_le_conversas_whatsapp" ON public.conversas_whatsapp
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'ver_cortai'));

CREATE POLICY "equipe_atualiza_conversas_whatsapp" ON public.conversas_whatsapp
  FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'gerenciar_conversas'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'gerenciar_conversas'));

CREATE TRIGGER conversas_whatsapp_atualizado_em
  BEFORE UPDATE ON public.conversas_whatsapp
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();

CREATE INDEX idx_conversas_whatsapp_tenant ON public.conversas_whatsapp(tenant_id, ultima_mensagem_em DESC);
CREATE INDEX idx_conversas_whatsapp_telefone ON public.conversas_whatsapp(telefone);

-- 3. Mensagens do WhatsApp
CREATE TABLE public.mensagens_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversa_id uuid NOT NULL REFERENCES public.conversas_whatsapp(id) ON DELETE CASCADE,
  conexao_id uuid REFERENCES public.conexoes_whatsapp(id) ON DELETE SET NULL,
  mensagem_externa_id text,
  direcao text NOT NULL,
  telefone_remetente text,
  telefone_destinatario text,
  tipo text NOT NULL DEFAULT 'text',
  conteudo text NOT NULL DEFAULT '',
  midia_url text,
  gerada_por_ia boolean NOT NULL DEFAULT false,
  gerada_por_humano boolean NOT NULL DEFAULT false,
  autor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'recebida',
  erro text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mensagens_whatsapp_direcao_valida CHECK (direcao IN ('entrada','saida')),
  CONSTRAINT mensagens_whatsapp_tipo_valido CHECK (tipo IN ('text','audio','image','document','location','interactive','unknown'))
);

CREATE UNIQUE INDEX idx_mensagens_whatsapp_externa
  ON public.mensagens_whatsapp(tenant_id, mensagem_externa_id)
  WHERE mensagem_externa_id IS NOT NULL;
CREATE INDEX idx_mensagens_whatsapp_conversa ON public.mensagens_whatsapp(conversa_id, criado_em);

GRANT SELECT ON public.mensagens_whatsapp TO authenticated;
GRANT ALL ON public.mensagens_whatsapp TO service_role;
ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_le_mensagens_whatsapp" ON public.mensagens_whatsapp
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'ver_cortai'));

-- 4. Configurações do atendimento inteligente
CREATE TABLE public.config_atendimento_ia (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  atendimento_automatico boolean NOT NULL DEFAULT true,
  saudacao_ativa boolean NOT NULL DEFAULT true,
  mensagem_boas_vindas text NOT NULL DEFAULT '',
  mensagem_fora_do_horario text NOT NULL DEFAULT '',
  permite_confirmar boolean NOT NULL DEFAULT true,
  permite_cancelar boolean NOT NULL DEFAULT true,
  permite_remarcar boolean NOT NULL DEFAULT true,
  encaminhamento_humano boolean NOT NULL DEFAULT true,
  lembretes boolean NOT NULL DEFAULT false,
  tom text NOT NULL DEFAULT 'profissional',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_atendimento_ia_tom_valido CHECK (tom IN ('profissional','amigavel','direto'))
);

GRANT SELECT, INSERT, UPDATE ON public.config_atendimento_ia TO authenticated;
GRANT ALL ON public.config_atendimento_ia TO service_role;
ALTER TABLE public.config_atendimento_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_le_config_ia" ON public.config_atendimento_ia
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'ver_cortai'));

CREATE POLICY "equipe_cria_config_ia" ON public.config_atendimento_ia
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_permission(tenant_id, 'configurar_automacoes'));

CREATE POLICY "equipe_atualiza_config_ia" ON public.config_atendimento_ia
  FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'configurar_automacoes'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'configurar_automacoes'));

CREATE TRIGGER config_atendimento_ia_atualizado_em
  BEFORE UPDATE ON public.config_atendimento_ia
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();

-- 5. Automações
CREATE TABLE public.automacoes_de_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  chave text NOT NULL,
  ativa boolean NOT NULL DEFAULT false,
  mensagem text NOT NULL DEFAULT '',
  gatilho jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automacoes_de_ia_unica UNIQUE (tenant_id, chave)
);

GRANT SELECT, INSERT, UPDATE ON public.automacoes_de_ia TO authenticated;
GRANT ALL ON public.automacoes_de_ia TO service_role;
ALTER TABLE public.automacoes_de_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_le_automacoes" ON public.automacoes_de_ia
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'ver_cortai'));

CREATE POLICY "equipe_cria_automacoes" ON public.automacoes_de_ia
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_permission(tenant_id, 'configurar_automacoes'));

CREATE POLICY "equipe_atualiza_automacoes" ON public.automacoes_de_ia
  FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'configurar_automacoes'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'configurar_automacoes'));

CREATE TRIGGER automacoes_de_ia_atualizado_em
  BEFORE UPDATE ON public.automacoes_de_ia
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();

-- 6. Registro das ações da IA
CREATE TABLE public.acoes_de_ia_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversa_id uuid REFERENCES public.conversas_whatsapp(id) ON DELETE SET NULL,
  acao text NOT NULL,
  entrada jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultado jsonb NOT NULL DEFAULT '{}'::jsonb,
  sucesso boolean NOT NULL DEFAULT true,
  erro text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.acoes_de_ia_log TO authenticated;
GRANT ALL ON public.acoes_de_ia_log TO service_role;
ALTER TABLE public.acoes_de_ia_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe_le_acoes_ia" ON public.acoes_de_ia_log
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'ver_cortai'));

CREATE INDEX idx_acoes_de_ia_log_tenant ON public.acoes_de_ia_log(tenant_id, criado_em DESC);

-- 7. Novas permissões da equipe
CREATE OR REPLACE FUNCTION public.permissoes_padrao(_papel text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _papel
    WHEN 'dono' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia','gerenciar_permissoes','acoes_destrutivas','gerenciar_voltai','ver_cortai','gerenciar_conversas','assumir_conversa','configurar_automacoes','gerenciar_whatsapp']::text[]
    WHEN 'gerente' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia','gerenciar_voltai','ver_cortai','gerenciar_conversas','assumir_conversa','configurar_automacoes','gerenciar_whatsapp']::text[]
    WHEN 'barbeiro' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes']::text[]
    WHEN 'recepcao' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes']::text[]
    ELSE '{}'::text[]
  END
$function$;