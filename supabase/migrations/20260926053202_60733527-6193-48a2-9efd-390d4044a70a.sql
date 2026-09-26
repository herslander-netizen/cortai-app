CREATE OR REPLACE FUNCTION public.estornar_pagamento_seguro(_ator uuid, _pagamento_id uuid, _motivo text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.pagamentos%ROWTYPE; sessao uuid;
BEGIN
  IF length(trim(COALESCE(_motivo,''))) < 3 THEN RAISE EXCEPTION 'informe o motivo do estorno'; END IF;
  SELECT * INTO p FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF p.id IS NULL OR NOT public.financeiro_tem_permissao(_ator, p.tenant_id, 'estorno_autorizar') THEN RAISE EXCEPTION 'sem permissao para estornar'; END IF;
  IF p.status <> 'confirmado' THEN RAISE EXCEPTION 'pagamento ja estornado ou nao confirmado'; END IF;
  IF p.valor_centavos > 0 AND p.forma_pagamento <> 'fiado' THEN
    SELECT id INTO sessao FROM public.caixa_sessoes WHERE tenant_id = p.tenant_id AND status = 'aberto' LIMIT 1;
    INSERT INTO public.caixa_movimentos(tenant_id, caixa_sessao_id, comanda_id, pagamento_id, tipo, categoria, descricao, valor_centavos, forma_pagamento, criado_por)
    VALUES (p.tenant_id, sessao, p.comanda_id, p.id, 'estorno', 'estorno', 'Estorno: ' || trim(_motivo), p.valor_centavos, p.forma_pagamento, _ator);
  END IF;
  UPDATE public.pagamentos SET status = 'estornado' WHERE id = p.id;
  INSERT INTO public.auditoria_da_barbearia(tenant_id, ator_user_id, acao, alvo, detalhes)
  VALUES (p.tenant_id, _ator, 'financeiro.estorno', p.id::text, jsonb_build_object('valor_centavos', p.valor_centavos, 'forma', p.forma_pagamento, 'motivo', trim(_motivo), 'comanda_id', p.comanda_id));
  RETURN jsonb_build_object('ok', true, 'valor_centavos', p.valor_centavos);
END $$;
REVOKE EXECUTE ON FUNCTION public.estornar_pagamento_seguro(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.estornar_pagamento_seguro(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.definir_ator_da_comanda() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RETURN NEW; END $$;
DROP FUNCTION public.definir_ator_da_comanda();

DO $$
DECLARE def text;
BEGIN
  def := pg_get_functiondef('public.salvar_comanda_segura(uuid,uuid,jsonb,integer)'::regprocedure);
  def := replace(def, 'BEGIN
 SELECT * INTO c FROM public.comandas WHERE id=_comanda_id FOR UPDATE;', 'BEGIN
 PERFORM set_config(''cortai.ator'', _ator::text, true);
 SELECT * INTO c FROM public.comandas WHERE id=_comanda_id FOR UPDATE;');
  IF position('cortai.ator' in def) = 0 THEN RAISE EXCEPTION 'ajuste nao aplicado'; END IF;
  EXECUTE def;
END $$;