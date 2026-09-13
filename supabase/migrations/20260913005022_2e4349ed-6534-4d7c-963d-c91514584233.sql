ALTER TABLE public.tenant_usuarios
  ADD COLUMN IF NOT EXISTS permissoes text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.tenant_usuarios DROP CONSTRAINT IF EXISTS tenant_usuarios_papel_check;
ALTER TABLE public.tenant_usuarios ADD CONSTRAINT tenant_usuarios_papel_check
  CHECK (papel IN ('dono', 'gerente', 'barbeiro', 'recepcao'));

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS pagamento_confirmado_em timestamptz,
  ADD COLUMN IF NOT EXISTS pagamento_confirmado_por uuid REFERENCES auth.users(id);

CREATE TABLE public.auditoria_da_barbearia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  alvo text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.auditoria_da_barbearia TO authenticated;
GRANT ALL ON public.auditoria_da_barbearia TO service_role;
ALTER TABLE public.auditoria_da_barbearia ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.permissoes_padrao(_papel text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _papel
    WHEN 'dono' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia','gerenciar_permissoes','acoes_destrutivas']::text[]
    WHEN 'gerente' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia']::text[]
    WHEN 'barbeiro' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes']::text[]
    WHEN 'recepcao' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes']::text[]
    ELSE '{}'::text[]
  END
$$;

UPDATE public.tenant_usuarios
SET permissoes = public.permissoes_padrao(papel)
WHERE cardinality(permissoes) = 0;

CREATE OR REPLACE FUNCTION public.has_tenant_permission(_tenant_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_usuarios tu
    WHERE tu.tenant_id = _tenant_id
      AND tu.user_id = auth.uid()
      AND (_permission = ANY(tu.permissoes) OR tu.papel = 'dono')
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_tenant_permission(uuid, text) TO authenticated;

CREATE POLICY "Membros autorizados veem auditoria da barbearia"
ON public.auditoria_da_barbearia FOR SELECT TO authenticated
USING (public.has_tenant_permission(tenant_id, 'gerenciar_permissoes'));

CREATE POLICY "Membros registram a propria auditoria"
ON public.auditoria_da_barbearia FOR INSERT TO authenticated
WITH CHECK (
  public.is_tenant_member(tenant_id)
  AND ator_user_id = auth.uid()
);

CREATE INDEX auditoria_da_barbearia_tenant_data_idx
ON public.auditoria_da_barbearia (tenant_id, criado_em DESC);

CREATE OR REPLACE FUNCTION public.registrar_auditoria_barbearia(
  _tenant_id uuid,
  _acao text,
  _alvo text,
  _detalhes jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_tenant_member(_tenant_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  INSERT INTO public.auditoria_da_barbearia (tenant_id, ator_user_id, acao, alvo, detalhes)
  VALUES (_tenant_id, auth.uid(), _acao, _alvo, COALESCE(_detalhes, '{}'::jsonb));
END;
$$;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria_barbearia(uuid, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_agendamento(
  _agendamento_id uuid,
  _forma_pagamento text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _status text;
BEGIN
  SELECT tenant_id, status INTO _tenant_id, _status
  FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF _tenant_id IS NULL OR NOT public.has_tenant_permission(_tenant_id, 'confirmar_pagamento') THEN
    RAISE EXCEPTION 'sem permissao para confirmar pagamento';
  END IF;
  IF _status IN ('cancelado', 'falta') THEN
    RAISE EXCEPTION 'este atendimento nao pode ser pago';
  END IF;
  UPDATE public.agendamentos
  SET forma_pagamento = _forma_pagamento,
      status = 'concluido',
      pagamento_confirmado_em = now(),
      pagamento_confirmado_por = auth.uid()
  WHERE id = _agendamento_id;
  INSERT INTO public.auditoria_da_barbearia (tenant_id, ator_user_id, acao, alvo, detalhes)
  VALUES (_tenant_id, auth.uid(), 'confirmou_pagamento', _agendamento_id::text, jsonb_build_object('forma_pagamento', _forma_pagamento));
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.confirmar_pagamento_agendamento(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_agendamento(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.tenant_usuarios
    WHERE tenant_id = _tenant_id AND user_id = auth.uid()
  )
$$;