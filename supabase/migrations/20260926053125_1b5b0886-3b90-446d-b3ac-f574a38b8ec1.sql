CREATE OR REPLACE FUNCTION public.exigir_preco_autorizado() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cat integer; t uuid; ator uuid := auth.uid();
BEGIN
  SELECT tenant_id INTO t FROM public.comandas WHERE id = NEW.comanda_id;
  IF NEW.tipo = 'servico' THEN SELECT preco_centavos INTO cat FROM public.servicos WHERE id = NEW.servico_id;
  ELSE SELECT preco_centavos INTO cat FROM public.produtos WHERE id = NEW.produto_id; END IF;
  IF cat IS NOT NULL AND NEW.valor_unitario_centavos <> cat THEN
    ator := COALESCE(ator, NULLIF(current_setting('cortai.ator', true), '')::uuid);
    IF ator IS NULL OR NOT public.financeiro_tem_permissao(ator, t, 'conceder_desconto') THEN
      RAISE EXCEPTION 'sem permissao para alterar preco';
    END IF;
    INSERT INTO public.auditoria_da_barbearia(tenant_id, ator_user_id, acao, alvo, detalhes)
    VALUES (t, ator, 'financeiro.preco_alterado', NEW.comanda_id::text, jsonb_build_object('item', NEW.descricao, 'catalogo_centavos', cat, 'cobrado_centavos', NEW.valor_unitario_centavos));
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.exigir_preco_autorizado() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.salvar_comanda_segura_com_ator() RETURNS void LANGUAGE sql AS $$ SELECT NULL::void $$;
DROP FUNCTION public.salvar_comanda_segura_com_ator();

DROP TRIGGER IF EXISTS comanda_itens_preco_autorizado ON public.comanda_itens;
CREATE TRIGGER comanda_itens_preco_autorizado BEFORE INSERT ON public.comanda_itens FOR EACH ROW EXECUTE FUNCTION public.exigir_preco_autorizado();

CREATE OR REPLACE FUNCTION public.estornar_pagamento_seguro(_ator uuid, _pagamento_id uuid, _motivo text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.pagamentos%ROWTYPE; sessao uuid;
BEGIN
  IF length(trim(COALESCE(_motivo,''))) < 3 THEN RAISE EXCEPTION 'informe o motivo do estorno'; END IF;
  SELECT * INTO p FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF p.id IS NULL OR NOT public.financeiro_tem_permissao(_ator, p.tenant_id, 'estorno_autorizar') THEN RAISE EXCEPTION 'sem permissao para estornar'; END IF;
  IF p.status <> 'confirmado' THEN RAISE EXCEPTION 'pagamento ja estornado ou nao confirmado'; END IF;
  SELECT id INTO sessao FROM public.caixa_sessoes WHERE tenant_id = p.tenant_id AND status = 'aberto' LIMIT 1;
  INSERT INTO public.caixa_movimentos(tenant_id, caixa_sessao_id, comanda_id, pagamento_id, tipo, categoria, descricao, valor_centavos, forma_pagamento, criado_por)
  VALUES (p.tenant_id, sessao, p.comanda_id, p.id, 'saida', 'estorno', 'Estorno: ' || trim(_motivo), p.valor_centavos, p.forma_pagamento, _ator);
  UPDATE public.pagamentos SET status = 'estornado' WHERE id = p.id;
  INSERT INTO public.auditoria_da_barbearia(tenant_id, ator_user_id, acao, alvo, detalhes)
  VALUES (p.tenant_id, _ator, 'financeiro.estorno', p.id::text, jsonb_build_object('valor_centavos', p.valor_centavos, 'forma', p.forma_pagamento, 'motivo', trim(_motivo), 'comanda_id', p.comanda_id));
  RETURN jsonb_build_object('ok', true, 'valor_centavos', p.valor_centavos);
END $$;
REVOKE EXECUTE ON FUNCTION public.estornar_pagamento_seguro(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.estornar_pagamento_seguro(uuid, uuid, text) TO service_role;