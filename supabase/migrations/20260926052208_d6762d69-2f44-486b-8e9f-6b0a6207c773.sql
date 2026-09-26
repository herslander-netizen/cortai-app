-- 1) criar_agendamento: selo de fidelidade sai do agendamento
CREATE OR REPLACE FUNCTION public.criar_agendamento(_tenant_id uuid, _cliente_id uuid, _profissional_id uuid, _servico_id uuid, _inicio timestamp with time zone, _forma_pagamento text, _encaixe boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_servico public.servicos%ROWTYPE;
  v_cliente public.clientes%ROWTYPE;
  v_carteira public.carteiras%ROWTYPE;
  v_regra public.regras_de_plano%ROWTYPE;
  v_fim timestamptz;
  v_ag_id uuid;
  v_disponivel int;
BEGIN
  IF _forma_pagamento NOT IN ('credito','pix','balcao','fiado') THEN
    RAISE EXCEPTION 'forma de pagamento invalida';
  END IF;
  IF _encaixe AND (auth.uid() IS NULL OR NOT public.is_tenant_member(_tenant_id)) THEN
    RAISE EXCEPTION 'encaixe so pelo painel';
  END IF;

  SELECT * INTO v_servico FROM public.servicos WHERE id = _servico_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'servico nao encontrado'; END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = _cliente_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'cliente nao encontrado'; END IF;

  v_fim := _inicio + make_interval(mins => v_servico.duracao_min);

  IF NOT _encaixe AND EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.profissional_id = _profissional_id
      AND a.status IN ('agendado','pendente','confirmado','chegou','na_cadeira')
      AND NOT a.encaixe
      AND a.inicio < v_fim AND a.fim > _inicio
  ) THEN
    RAISE EXCEPTION 'horario ja ocupado';
  END IF;

  SELECT * INTO v_carteira FROM public.carteiras WHERE cliente_id = _cliente_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN
    INSERT INTO public.carteiras (tenant_id, cliente_id) VALUES (_tenant_id, _cliente_id)
    RETURNING * INTO v_carteira;
  END IF;

  IF _forma_pagamento = 'credito' THEN
    IF v_carteira.saldo_creditos < 1 THEN RAISE EXCEPTION 'sem creditos disponiveis'; END IF;
  ELSIF _forma_pagamento = 'fiado' THEN
    SELECT * INTO v_regra FROM public.regras_de_plano
      WHERE tenant_id = _tenant_id AND tipo = 'fiado' AND ativo LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'fiado nao disponivel'; END IF;
    v_disponivel := v_cliente.limite_fiado_centavos + LEAST(v_carteira.saldo_centavos, 0);
    IF v_servico.preco_centavos > v_disponivel AND v_regra.bloqueia_agendamento_no_limite THEN
      RAISE EXCEPTION 'limite de fiado atingido';
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.agendamentos (tenant_id, cliente_id, profissional_id, servico_id, inicio, fim, status, forma_pagamento, valor_centavos, encaixe)
    VALUES (_tenant_id, _cliente_id, _profissional_id, _servico_id, _inicio, v_fim, 'agendado', _forma_pagamento,
            CASE WHEN _forma_pagamento = 'credito' THEN 0 ELSE v_servico.preco_centavos END, _encaixe)
    RETURNING id INTO v_ag_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'horario ja ocupado';
  END;

  IF _forma_pagamento = 'credito' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, agendamento_id, descricao, criado_por)
    VALUES (v_carteira.id, 'debito', -1, 'mensal', v_ag_id, 'Uso de 1 credito em ' || v_servico.nome, auth.uid());
  ELSIF _forma_pagamento = 'fiado' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, centavos_delta, origem, agendamento_id, descricao, criado_por)
    VALUES (v_carteira.id, 'fiado', -v_servico.preco_centavos, 'fiado', v_ag_id, 'Fiado: ' || v_servico.nome, auth.uid());
  END IF;

  SELECT * INTO v_carteira FROM public.carteiras WHERE id = v_carteira.id;

  RETURN jsonb_build_object(
    'agendamento_id', v_ag_id,
    'inicio', _inicio,
    'fim', v_fim,
    'forma_pagamento', _forma_pagamento,
    'valor_centavos', CASE WHEN _forma_pagamento = 'credito' THEN 0 ELSE v_servico.preco_centavos END,
    'saldo_creditos', v_carteira.saldo_creditos,
    'saldo_centavos', v_carteira.saldo_centavos,
    'fidelidade_progresso', v_carteira.fidelidade_progresso,
    'fidelidade_alvo', (SELECT fidelidade_alvo FROM public.regras_de_plano WHERE tenant_id = _tenant_id AND tipo = 'fidelidade' AND ativo LIMIT 1)
  );
END;
$function$;

-- 2) helper: selo de fidelidade na conclusao do atendimento
CREATE OR REPLACE FUNCTION public.creditar_fidelidade_da_comanda(_comanda_id uuid, _ator uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.comandas%ROWTYPE; cart public.carteiras%ROWTYPE; qtd integer;
BEGIN
  SELECT * INTO c FROM public.comandas WHERE id = _comanda_id;
  IF c.id IS NULL OR c.cliente_id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.regras_de_plano WHERE tenant_id = c.tenant_id AND tipo = 'fidelidade' AND ativo) THEN RETURN; END IF;
  SELECT COALESCE(sum(quantidade),0) INTO qtd FROM public.comanda_itens WHERE comanda_id = c.id AND tipo = 'servico';
  IF qtd < 1 THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.movimentos m JOIN public.carteiras w ON w.id = m.carteira_id
             WHERE m.tipo = 'fidelidade' AND m.creditos_delta > 0 AND m.comanda_id = c.id) THEN RETURN; END IF;
  SELECT * INTO cart FROM public.carteiras WHERE tenant_id = c.tenant_id AND cliente_id = c.cliente_id;
  IF cart.id IS NULL THEN
    INSERT INTO public.carteiras (tenant_id, cliente_id) VALUES (c.tenant_id, c.cliente_id) RETURNING * INTO cart;
  END IF;
  INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, agendamento_id, comanda_id, descricao, criado_por)
  VALUES (cart.id, 'fidelidade', 1, 'fidelidade', c.agendamento_id, c.id, 'Selo de fidelidade pelo atendimento concluido', _ator);
END;
$function$;

REVOKE ALL ON FUNCTION public.creditar_fidelidade_da_comanda(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creditar_fidelidade_da_comanda(uuid, uuid) TO service_role;

-- 3) confirmar_pagamento_comanda_segura: trava de fiado, comissao liquida, selo na conclusao
CREATE OR REPLACE FUNCTION public.confirmar_pagamento_comanda_segura(_ator uuid, _comanda_id uuid, _forma text, _somente_preparar_pix boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.comandas%ROWTYPE; pg uuid; sessao uuid; resumo text; it public.comanda_itens%ROWTYPE; cli public.clientes%ROWTYPE; devido integer; base_liq integer;
BEGIN
 SELECT * INTO c FROM public.comandas WHERE id=_comanda_id FOR UPDATE; IF c.id IS NULL OR NOT public.financeiro_tem_permissao(_ator,c.tenant_id,'confirmar_pagamento') THEN RAISE EXCEPTION 'sem permissao'; END IF;
 IF c.status IN ('paga','fiado') THEN RETURN jsonb_build_object('ok',true,'idempotente',true,'status',c.status); END IF;
 IF c.status<>'aguardando_pagamento' AND NOT (c.status='aguardando_confirmacao_pix' AND _forma='pix') THEN RAISE EXCEPTION 'comanda nao esta pronta para pagamento'; END IF;
 IF _forma NOT IN ('pix','dinheiro','cartao','fiado') THEN RAISE EXCEPTION 'forma invalida'; END IF;

 IF _forma='fiado' THEN
  IF NOT public.financeiro_tem_permissao(_ator,c.tenant_id,'liberar_fiado') THEN RAISE EXCEPTION 'so o dono pode liberar fiado'; END IF;
  IF c.cliente_id IS NULL THEN RAISE EXCEPTION 'fiado exige cliente identificado'; END IF;
  SELECT * INTO cli FROM public.clientes WHERE id=c.cliente_id AND tenant_id=c.tenant_id FOR UPDATE;
  IF cli.id IS NULL THEN RAISE EXCEPTION 'cliente nao encontrado'; END IF;
  SELECT COALESCE(sum(saldo_centavos),0) INTO devido FROM public.fiados WHERE tenant_id=c.tenant_id AND cliente_id=c.cliente_id AND saldo_centavos>0;
  IF devido + c.total_centavos > COALESCE(cli.limite_fiado_centavos,0) THEN RAISE EXCEPTION 'limite de fiado atingido'; END IF;
 END IF;

 IF _forma='pix' AND _somente_preparar_pix THEN INSERT INTO public.pagamentos(tenant_id,comanda_id,forma_pagamento,valor_centavos,status,criado_por) VALUES(c.tenant_id,c.id,'pix',c.total_centavos,'aguardando_confirmacao',_ator) RETURNING id INTO pg; UPDATE public.comandas SET status='aguardando_confirmacao_pix',atualizado_em=now() WHERE id=c.id; RETURN jsonb_build_object('ok',true,'status','aguardando_confirmacao_pix','pagamento_id',pg); END IF;
 SELECT id INTO pg FROM public.pagamentos WHERE comanda_id=c.id AND status='aguardando_confirmacao' ORDER BY criado_em DESC LIMIT 1;
 IF pg IS NULL THEN INSERT INTO public.pagamentos(tenant_id,comanda_id,forma_pagamento,valor_centavos,status,criado_por,confirmado_por,confirmado_em) VALUES(c.tenant_id,c.id,_forma,c.total_centavos,'confirmado',_ator,_ator,now()) RETURNING id INTO pg; ELSE UPDATE public.pagamentos SET status='confirmado',confirmado_por=_ator,confirmado_em=now() WHERE id=pg; END IF;
 SELECT id INTO sessao FROM public.caixa_sessoes WHERE tenant_id=c.tenant_id AND status='aberto'; SELECT string_agg(descricao || CASE WHEN quantidade>1 THEN ' x'||quantidade ELSE '' END,' + ') INTO resumo FROM public.comanda_itens WHERE comanda_id=c.id;
 IF _forma='fiado' THEN INSERT INTO public.fiados(tenant_id,comanda_id,cliente_id,profissional_id,valor_centavos,saldo_centavos,criado_por) VALUES(c.tenant_id,c.id,c.cliente_id,c.profissional_id,c.total_centavos,c.total_centavos,_ator); UPDATE public.comandas SET status='fiado',finalizada_por=_ator,finalizada_em=now(),atualizado_em=now() WHERE id=c.id;
 ELSE INSERT INTO public.caixa_movimentos(tenant_id,caixa_sessao_id,comanda_id,pagamento_id,cliente_id,profissional_id,tipo,categoria,descricao,valor_centavos,forma_pagamento,criado_por) VALUES(c.tenant_id,sessao,c.id,pg,c.cliente_id,c.profissional_id,'entrada','comanda',COALESCE(resumo,'Comanda'),c.total_centavos,_forma,_ator); UPDATE public.comandas SET status='paga',finalizada_por=_ator,finalizada_em=now(),atualizado_em=now() WHERE id=c.id; END IF;
 FOR it IN SELECT * FROM public.comanda_itens WHERE comanda_id=c.id LOOP
  IF it.tipo='produto' THEN UPDATE public.produtos SET quantidade=quantidade-it.quantidade WHERE id=it.produto_id AND (NOT controla_estoque OR quantidade>=it.quantidade); IF NOT FOUND THEN RAISE EXCEPTION 'estoque insuficiente'; END IF; END IF;
  IF c.profissional_id IS NOT NULL AND it.comissao_centavos>0 THEN
   base_liq := it.valor_total_centavos - CASE WHEN COALESCE(c.subtotal_centavos,0)=0 THEN 0 ELSE round(COALESCE(c.desconto_centavos,0)::numeric*it.valor_total_centavos/c.subtotal_centavos) END;
   INSERT INTO public.comissoes(tenant_id,comanda_id,item_comanda_id,profissional_id,tipo_item,base_centavos,percentual,valor_centavos) VALUES(c.tenant_id,c.id,it.id,c.profissional_id,it.tipo,base_liq,it.comissao_percentual,it.comissao_centavos); END IF;
 END LOOP;
 IF c.agendamento_id IS NOT NULL THEN UPDATE public.agendamentos SET status='finalizado',forma_pagamento=CASE WHEN _forma IN ('dinheiro','cartao') THEN 'balcao' ELSE _forma END,pagamento_confirmado_em=CASE WHEN _forma='fiado' THEN NULL ELSE now() END,pagamento_confirmado_por=CASE WHEN _forma='fiado' THEN NULL ELSE _ator END WHERE id=c.agendamento_id; END IF;
 PERFORM public.creditar_fidelidade_da_comanda(c.id,_ator);
 INSERT INTO public.auditoria_da_barbearia(tenant_id,ator_user_id,acao,alvo,detalhes) VALUES(c.tenant_id,_ator,'financeiro.comanda_finalizada',c.id::text,jsonb_build_object('forma',_forma,'total_centavos',c.total_centavos,'pagamento_id',pg));
 RETURN jsonb_build_object('ok',true,'status',CASE WHEN _forma='fiado' THEN 'fiado' ELSE 'paga' END,'pagamento_id',pg);
END $function$;

-- 4) pagar_comanda_com_plano_segura: comissao liquida + selo na conclusao
CREATE OR REPLACE FUNCTION public.pagar_comanda_com_plano_segura(_ator uuid, _comanda_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.comandas%ROWTYPE; a public.agendamentos%ROWTYPE; cart public.carteiras%ROWTYPE; qtd integer; ja_reservado boolean := false; it public.comanda_itens%ROWTYPE; base_liq integer;
BEGIN
 SELECT * INTO c FROM public.comandas WHERE id=_comanda_id FOR UPDATE;
 IF c.id IS NULL OR NOT public.financeiro_tem_permissao(_ator,c.tenant_id,'confirmar_pagamento') THEN RAISE EXCEPTION 'sem permissao'; END IF;
 IF c.status IN ('paga','fiado') THEN RETURN jsonb_build_object('ok',true,'idempotente',true,'status',c.status); END IF;
 IF c.status<>'aguardando_pagamento' THEN RAISE EXCEPTION 'comanda nao esta pronta para pagamento'; END IF;
 IF EXISTS (SELECT 1 FROM public.comanda_itens WHERE comanda_id=c.id AND tipo='produto') THEN RAISE EXCEPTION 'o plano cobre so servicos; cobre os produtos a parte'; END IF;
 SELECT COALESCE(sum(quantidade),0) INTO qtd FROM public.comanda_itens WHERE comanda_id=c.id AND tipo='servico';
 IF qtd < 1 THEN RAISE EXCEPTION 'nenhum servico na comanda'; END IF;
 IF c.agendamento_id IS NOT NULL THEN SELECT * INTO a FROM public.agendamentos WHERE id=c.agendamento_id; ja_reservado := a.forma_pagamento='credito'; END IF;
 IF ja_reservado THEN qtd := qtd - 1; END IF;
 IF qtd > 0 THEN
  SELECT * INTO cart FROM public.carteiras WHERE tenant_id=c.tenant_id AND cliente_id=c.cliente_id FOR UPDATE;
  IF cart.id IS NULL OR cart.saldo_creditos < qtd THEN RAISE EXCEPTION 'sem creditos disponiveis no plano'; END IF;
  INSERT INTO public.movimentos(carteira_id,tipo,creditos_delta,origem,agendamento_id,descricao,criado_por) VALUES(cart.id,'debito',-qtd,'mensal',c.agendamento_id,'Uso do plano na comanda #'||c.numero,_ator);
 END IF;
 FOR it IN SELECT * FROM public.comanda_itens WHERE comanda_id=c.id LOOP
  IF c.profissional_id IS NOT NULL AND it.comissao_centavos>0 THEN
   base_liq := it.valor_total_centavos - CASE WHEN COALESCE(c.subtotal_centavos,0)=0 THEN 0 ELSE round(COALESCE(c.desconto_centavos,0)::numeric*it.valor_total_centavos/c.subtotal_centavos) END;
   INSERT INTO public.comissoes(tenant_id,comanda_id,item_comanda_id,profissional_id,tipo_item,base_centavos,percentual,valor_centavos) VALUES(c.tenant_id,c.id,it.id,c.profissional_id,it.tipo,base_liq,it.comissao_percentual,it.comissao_centavos); END IF;
 END LOOP;
 UPDATE public.comandas SET status='paga',finalizada_por=_ator,finalizada_em=now(),atualizado_em=now() WHERE id=c.id;
 IF c.agendamento_id IS NOT NULL THEN UPDATE public.agendamentos SET status='finalizado',forma_pagamento='credito',pagamento_confirmado_em=now(),pagamento_confirmado_por=_ator WHERE id=c.agendamento_id; END IF;
 PERFORM public.creditar_fidelidade_da_comanda(c.id,_ator);
 INSERT INTO public.auditoria_da_barbearia(tenant_id,ator_user_id,acao,alvo,detalhes) VALUES(c.tenant_id,_ator,'financeiro.comanda_finalizada',c.id::text,jsonb_build_object('forma','plano','total_centavos',c.total_centavos));
 RETURN jsonb_build_object('ok',true,'status','paga','forma','plano');
END $function$;