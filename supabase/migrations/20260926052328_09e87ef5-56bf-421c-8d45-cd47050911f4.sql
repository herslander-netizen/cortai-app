CREATE OR REPLACE FUNCTION public.confirmar_pagamento_comanda_segura(_ator uuid, _comanda_id uuid, _forma text, _somente_preparar_pix boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.comandas%ROWTYPE; pg uuid; sessao uuid; resumo text; it public.comanda_itens%ROWTYPE; cli public.clientes%ROWTYPE; devido integer; base_liq integer; cart public.carteiras%ROWTYPE; ja_fiado boolean := false;
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
 IF _forma='fiado' THEN
  INSERT INTO public.fiados(tenant_id,comanda_id,cliente_id,profissional_id,valor_centavos,saldo_centavos,criado_por) VALUES(c.tenant_id,c.id,c.cliente_id,c.profissional_id,c.total_centavos,c.total_centavos,_ator);
  UPDATE public.comandas SET status='fiado',finalizada_por=_ator,finalizada_em=now(),atualizado_em=now() WHERE id=c.id;
  IF c.agendamento_id IS NOT NULL THEN
   SELECT EXISTS (SELECT 1 FROM public.movimentos WHERE agendamento_id=c.agendamento_id AND tipo='fiado' AND centavos_delta<0) INTO ja_fiado;
  END IF;
  IF NOT ja_fiado THEN
   SELECT * INTO cart FROM public.carteiras WHERE tenant_id=c.tenant_id AND cliente_id=c.cliente_id;
   IF cart.id IS NULL THEN INSERT INTO public.carteiras(tenant_id,cliente_id) VALUES(c.tenant_id,c.cliente_id) RETURNING * INTO cart; END IF;
   INSERT INTO public.movimentos(carteira_id,tipo,centavos_delta,origem,agendamento_id,comanda_id,descricao,criado_por)
   VALUES(cart.id,'fiado',-c.total_centavos,'fiado',c.agendamento_id,c.id,'Fiado da comanda #'||c.numero,_ator);
  END IF;
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