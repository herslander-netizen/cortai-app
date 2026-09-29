CREATE TABLE IF NOT EXISTS public.exclusoes_permanentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  alvo_id uuid,
  alvo_nome text,
  tenant_id uuid,
  ator_id uuid NOT NULL,
  ator_email text,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exclusoes_permanentes TO authenticated;
GRANT ALL ON public.exclusoes_permanentes TO service_role;
ALTER TABLE public.exclusoes_permanentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins veem exclusoes" ON public.exclusoes_permanentes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.financeiro_append_only()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$ BEGIN
  IF TG_OP = 'DELETE' AND current_setting('cortai.exclusao_tenant', true) = 'on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'historico financeiro nao pode ser alterado ou apagado';
END; $$;

CREATE OR REPLACE FUNCTION public.movimentos_append_only()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$ BEGIN
  IF TG_OP = 'DELETE' AND current_setting('cortai.exclusao_tenant', true) = 'on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'movimentos e append-only: UPDATE/DELETE nao sao permitidos';
END; $$;

CREATE OR REPLACE FUNCTION public.comanda_itens_proteger_historico()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$ BEGIN
  IF TG_OP = 'DELETE' AND current_setting('cortai.exclusao_tenant', true) = 'on' THEN RETURN OLD; END IF;
  IF EXISTS (SELECT 1 FROM public.comandas c WHERE c.id = OLD.comanda_id AND c.status IN ('paga','fiado','estornada')) THEN
    RAISE EXCEPTION 'itens de uma comanda finalizada nao podem ser alterados ou apagados';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.excluir_tenant_completo(_tenant_id uuid, _ator uuid, _ator_email text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _nome text;
BEGIN
  SELECT nome INTO _nome FROM public.tenants WHERE id = _tenant_id;
  IF _nome IS NULL THEN RAISE EXCEPTION 'Negócio não encontrado.'; END IF;
  PERFORM set_config('cortai.exclusao_tenant', 'on', true);

  DELETE FROM public.caixa_movimentos WHERE tenant_id = _tenant_id AND movimento_original_id IS NOT NULL;
  DELETE FROM public.caixa_movimentos WHERE tenant_id = _tenant_id;
  DELETE FROM public.comissoes WHERE tenant_id = _tenant_id;
  DELETE FROM public.comissao_pagamentos WHERE tenant_id = _tenant_id;
  DELETE FROM public.fiados WHERE tenant_id = _tenant_id;
  DELETE FROM public.pagamentos WHERE tenant_id = _tenant_id;
  DELETE FROM public.caixa_sessoes WHERE tenant_id = _tenant_id;
  DELETE FROM public.comanda_itens WHERE comanda_id IN (SELECT id FROM public.comandas WHERE tenant_id = _tenant_id);
  DELETE FROM public.comandas WHERE tenant_id = _tenant_id;
  DELETE FROM public.movimentos WHERE carteira_id IN (SELECT id FROM public.carteiras WHERE tenant_id = _tenant_id);
  DELETE FROM public.venda_itens WHERE venda_id IN (SELECT id FROM public.vendas WHERE tenant_id = _tenant_id);
  DELETE FROM public.vendas WHERE tenant_id = _tenant_id;
  DELETE FROM public.avaliacoes WHERE tenant_id = _tenant_id;
  DELETE FROM public.fila_de_espera WHERE tenant_id = _tenant_id;
  DELETE FROM public.indicacoes WHERE tenant_id = _tenant_id;
  DELETE FROM public.agendamentos WHERE tenant_id = _tenant_id;
  DELETE FROM public.carteiras WHERE tenant_id = _tenant_id;
  DELETE FROM public.clientes WHERE tenant_id = _tenant_id;
  DELETE FROM public.produtos WHERE tenant_id = _tenant_id;
  DELETE FROM public.servicos WHERE tenant_id = _tenant_id;
  DELETE FROM public.profissionais WHERE tenant_id = _tenant_id;
  DELETE FROM public.tenant_usuarios WHERE tenant_id = _tenant_id;
  DELETE FROM public.tenants WHERE id = _tenant_id;

  INSERT INTO public.exclusoes_permanentes(tipo, alvo_id, alvo_nome, tenant_id, ator_id, ator_email)
  VALUES ('negocio', _tenant_id, _nome, _tenant_id, _ator, _ator_email);
  RETURN jsonb_build_object('ok', true, 'nome', _nome);
END; $$;

REVOKE ALL ON FUNCTION public.excluir_tenant_completo(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_tenant_completo(uuid, uuid, text) TO service_role;