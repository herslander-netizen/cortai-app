CREATE OR REPLACE FUNCTION public.eh_profissional_do(_ator uuid, _profissional_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profissionais p WHERE p.id = _profissional_id AND p.user_id = _ator AND p.ativo);
$$;
REVOKE ALL ON FUNCTION public.eh_profissional_do(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eh_profissional_do(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.preparar_comanda_segura(_ator uuid, _agendamento_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.agendamentos%ROWTYPE; s public.servicos%ROWTYPE; cfg public.configuracoes_financeiras%ROWTYPE; cid uuid;
BEGIN
 SELECT * INTO a FROM public.agendamentos WHERE id=_agendamento_id FOR UPDATE;
 IF a.id IS NULL OR NOT (public.financeiro_tem_permissao(_ator,a.tenant_id,'confirmar_pagamento') OR public.eh_profissional_do(_ator,a.profissional_id)) THEN RAISE EXCEPTION 'sem permissao'; END IF;
 IF a.status IN ('cancelado','nao_compareceu','remarcado') THEN RAISE EXCEPTION 'agendamento nao pode ser atendido'; END IF;
 SELECT id INTO cid FROM public.comandas WHERE agendamento_id=a.id;
 IF cid IS NOT NULL THEN RETURN cid; END IF;
 INSERT INTO public.configuracoes_financeiras(tenant_id) VALUES(a.tenant_id) ON CONFLICT DO NOTHING;
 SELECT * INTO cfg FROM public.configuracoes_financeiras WHERE tenant_id=a.tenant_id;
 INSERT INTO public.comandas(tenant_id,cliente_id,profissional_id,agendamento_id,status,aberta_por) VALUES(a.tenant_id,a.cliente_id,a.profissional_id,a.id,'em_atendimento',_ator) RETURNING id INTO cid;
 IF a.servico_id IS NOT NULL THEN SELECT * INTO s FROM public.servicos WHERE id=a.servico_id AND tenant_id=a.tenant_id; INSERT INTO public.comanda_itens(comanda_id,tipo,servico_id,descricao,quantidade,valor_unitario_centavos,valor_total_centavos,comissao_percentual,comissao_centavos) VALUES(cid,'servico',s.id,s.nome,1,a.valor_centavos,a.valor_centavos,COALESCE(s.comissao_percentual,cfg.comissao_servico_percentual),round(a.valor_centavos*COALESCE(s.comissao_percentual,cfg.comissao_servico_percentual)/100.0)); END IF;
 UPDATE public.agendamentos SET status='agendado' WHERE id=a.id AND status='agendado'; RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.salvar_comanda_segura(_ator uuid, _comanda_id uuid, _itens jsonb, _desconto_centavos integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.comandas%ROWTYPE; cfg public.configuracoes_financeiras%ROWTYPE; item jsonb; s public.servicos%ROWTYPE; p public.produtos%ROWTYPE; subtotal integer:=0; total integer; base integer; pct numeric; comissao_total integer:=0;
BEGIN
 SELECT * INTO c FROM public.comandas WHERE id=_comanda_id FOR UPDATE;
 IF c.id IS NULL OR NOT (public.financeiro_tem_permissao(_ator,c.tenant_id,'confirmar_pagamento') OR public.eh_profissional_do(_ator,c.profissional_id)) THEN RAISE EXCEPTION 'sem permissao'; END IF;
 IF c.status NOT IN ('aberta','em_atendimento','aguardando_pagamento','aguardando_confirmacao_pix') THEN RAISE EXCEPTION 'comanda ja finalizada'; END IF;
 IF _desconto_centavos<0 THEN RAISE EXCEPTION 'desconto invalido'; END IF;
 IF _desconto_centavos>0 AND NOT public.financeiro_tem_permissao(_ator,c.tenant_id,'conceder_desconto') THEN RAISE EXCEPTION 'sem permissao para desconto'; END IF;
 IF jsonb_typeof(_itens)<>'array' OR jsonb_array_length(_itens)=0 THEN RAISE EXCEPTION 'adicione ao menos um item'; END IF;
 INSERT INTO public.configuracoes_financeiras(tenant_id) VALUES(c.tenant_id) ON CONFLICT DO NOTHING; SELECT * INTO cfg FROM public.configuracoes_financeiras WHERE tenant_id=c.tenant_id;
 DELETE FROM public.comanda_itens WHERE comanda_id=c.id;
 FOR item IN SELECT * FROM jsonb_array_elements(_itens) LOOP
  IF COALESCE((item->>'quantidade')::integer,0)<=0 THEN RAISE EXCEPTION 'quantidade invalida'; END IF;
  IF item->>'tipo'='servico' THEN
   SELECT * INTO s FROM public.servicos WHERE id=(item->>'id')::uuid AND tenant_id=c.tenant_id AND ativo; IF s.id IS NULL THEN RAISE EXCEPTION 'servico invalido'; END IF;
   base:=COALESCE((item->>'valor_unitario_centavos')::integer,s.preco_centavos); pct:=COALESCE(s.comissao_percentual,cfg.comissao_servico_percentual); subtotal:=subtotal+base*(item->>'quantidade')::integer;
   INSERT INTO public.comanda_itens(comanda_id,tipo,servico_id,descricao,quantidade,valor_unitario_centavos,valor_total_centavos,comissao_percentual,comissao_centavos) VALUES(c.id,'servico',s.id,s.nome,(item->>'quantidade')::integer,base,base*(item->>'quantidade')::integer,pct,0);
  ELSIF item->>'tipo'='produto' THEN
   SELECT * INTO p FROM public.produtos WHERE id=(item->>'id')::uuid AND tenant_id=c.tenant_id AND ativo FOR UPDATE; IF p.id IS NULL OR (p.controla_estoque AND p.quantidade<(item->>'quantidade')::integer) THEN RAISE EXCEPTION 'produto indisponivel'; END IF;
   base:=COALESCE((item->>'valor_unitario_centavos')::integer,p.preco_centavos); pct:=COALESCE(p.comissao_percentual,cfg.comissao_produto_percentual); subtotal:=subtotal+base*(item->>'quantidade')::integer;
   INSERT INTO public.comanda_itens(comanda_id,tipo,produto_id,descricao,quantidade,valor_unitario_centavos,valor_total_centavos,comissao_percentual,comissao_centavos) VALUES(c.id,'produto',p.id,p.nome,(item->>'quantidade')::integer,base,base*(item->>'quantidade')::integer,pct,0);
  ELSE RAISE EXCEPTION 'tipo de item invalido'; END IF;
 END LOOP;
 IF _desconto_centavos>subtotal THEN RAISE EXCEPTION 'desconto maior que subtotal'; END IF; total:=subtotal-_desconto_centavos;
 UPDATE public.comanda_itens i SET comissao_centavos=round((i.valor_total_centavos-CASE WHEN subtotal=0 THEN 0 ELSE (_desconto_centavos::numeric*i.valor_total_centavos/subtotal) END)*i.comissao_percentual/100.0) WHERE i.comanda_id=c.id;
 SELECT COALESCE(sum(comissao_centavos),0) INTO comissao_total FROM public.comanda_itens WHERE comanda_id=c.id;
 UPDATE public.comandas SET subtotal_centavos=subtotal,desconto_centavos=_desconto_centavos,total_centavos=total,comissao_total_centavos=comissao_total,desconto_aplicado_por=CASE WHEN _desconto_centavos>0 THEN _ator ELSE NULL END,status='aguardando_pagamento',atualizado_em=now() WHERE id=c.id;
 IF _desconto_centavos>0 THEN INSERT INTO public.auditoria_da_barbearia(tenant_id,ator_user_id,acao,alvo,detalhes) VALUES(c.tenant_id,_ator,'financeiro.desconto',c.id::text,jsonb_build_object('subtotal_centavos',subtotal,'desconto_centavos',_desconto_centavos,'total_centavos',total)); END IF;
 RETURN jsonb_build_object('comanda_id',c.id,'subtotal_centavos',subtotal,'desconto_centavos',_desconto_centavos,'total_centavos',total,'comissao_total_centavos',comissao_total);
END $$;

CREATE OR REPLACE FUNCTION public.pagar_comanda_com_plano_segura(_ator uuid, _comanda_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.comandas%ROWTYPE; a public.agendamentos%ROWTYPE; cart public.carteiras%ROWTYPE; qtd integer; ja_reservado boolean := false; it public.comanda_itens%ROWTYPE;
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
  IF c.profissional_id IS NOT NULL AND it.comissao_centavos>0 THEN INSERT INTO public.comissoes(tenant_id,comanda_id,item_comanda_id,profissional_id,tipo_item,base_centavos,percentual,valor_centavos) VALUES(c.tenant_id,c.id,it.id,c.profissional_id,it.tipo,it.valor_total_centavos,it.comissao_percentual,it.comissao_centavos); END IF;
 END LOOP;
 UPDATE public.comandas SET status='paga',finalizada_por=_ator,finalizada_em=now(),atualizado_em=now() WHERE id=c.id;
 IF c.agendamento_id IS NOT NULL THEN UPDATE public.agendamentos SET status='finalizado',forma_pagamento='credito',pagamento_confirmado_em=now(),pagamento_confirmado_por=_ator WHERE id=c.agendamento_id; END IF;
 INSERT INTO public.auditoria_da_barbearia(tenant_id,ator_user_id,acao,alvo,detalhes) VALUES(c.tenant_id,_ator,'financeiro.comanda_finalizada',c.id::text,jsonb_build_object('forma','plano','total_centavos',c.total_centavos));
 RETURN jsonb_build_object('ok',true,'status','paga','forma','plano');
END $$;
REVOKE ALL ON FUNCTION public.pagar_comanda_com_plano_segura(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pagar_comanda_com_plano_segura(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.preparar_comanda_segura(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.salvar_comanda_segura(uuid, uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preparar_comanda_segura(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.salvar_comanda_segura(uuid, uuid, jsonb, integer) TO service_role;