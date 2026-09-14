-- 1. Intenção identificada (observabilidade)
ALTER TABLE public.conversas_whatsapp ADD COLUMN IF NOT EXISTS intencao text;
ALTER TABLE public.acoes_de_ia_log ADD COLUMN IF NOT EXISTS intencao text;

-- 2. Tons adicionais + preparação da recuperação de clientes
ALTER TABLE public.config_atendimento_ia DROP CONSTRAINT IF EXISTS config_atendimento_ia_tom_check;
ALTER TABLE public.config_atendimento_ia
  ADD CONSTRAINT config_atendimento_ia_tom_check
  CHECK (tom IN ('profissional','amigavel','direto','premium','objetivo'));
ALTER TABLE public.config_atendimento_ia ADD COLUMN IF NOT EXISTS recuperacao_ativa boolean NOT NULL DEFAULT false;
ALTER TABLE public.config_atendimento_ia ADD COLUMN IF NOT EXISTS recuperacao_dias integer NOT NULL DEFAULT 30;

-- 3. Informações oficiais da barbearia (FAQ)
CREATE TABLE IF NOT EXISTS public.informacoes_da_barbearia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pergunta text NOT NULL,
  resposta text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.informacoes_da_barbearia TO authenticated;
GRANT ALL ON public.informacoes_da_barbearia TO service_role;
ALTER TABLE public.informacoes_da_barbearia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe ve informacoes da propria barbearia" ON public.informacoes_da_barbearia
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "responsaveis escrevem informacoes" ON public.informacoes_da_barbearia
  FOR ALL TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia') OR public.has_tenant_permission(tenant_id, 'configurar_automacoes'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia') OR public.has_tenant_permission(tenant_id, 'configurar_automacoes'));
CREATE TRIGGER informacoes_da_barbearia_atualizado_em BEFORE UPDATE ON public.informacoes_da_barbearia
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();
CREATE INDEX IF NOT EXISTS idx_informacoes_tenant ON public.informacoes_da_barbearia(tenant_id, ativo, ordem);

-- 4. Memória do cliente (preferências informadas pela pessoa)
CREATE TABLE IF NOT EXISTS public.memoria_do_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  chave text NOT NULL,
  valor text NOT NULL,
  origem text NOT NULL DEFAULT 'conversa',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, cliente_id, chave)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memoria_do_cliente TO authenticated;
GRANT ALL ON public.memoria_do_cliente TO service_role;
ALTER TABLE public.memoria_do_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe ve memoria dos proprios clientes" ON public.memoria_do_cliente
  FOR SELECT TO authenticated USING (public.has_tenant_permission(tenant_id, 'visualizar_clientes'));
CREATE POLICY "equipe edita memoria dos proprios clientes" ON public.memoria_do_cliente
  FOR ALL TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'editar_clientes'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'editar_clientes'));
CREATE TRIGGER memoria_do_cliente_atualizado_em BEFORE UPDATE ON public.memoria_do_cliente
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();
CREATE INDEX IF NOT EXISTS idx_memoria_cliente ON public.memoria_do_cliente(tenant_id, cliente_id);