REVOKE ALL ON FUNCTION public.preparar_comanda(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.salvar_comanda(uuid,jsonb,integer) FROM authenticated;
REVOKE ALL ON FUNCTION public.confirmar_pagamento_comanda(uuid,text,boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.salvar_configuracao_financeira(boolean,text,text,text,numeric,numeric) FROM authenticated;

CREATE OR REPLACE FUNCTION public.financeiro_tem_permissao(_ator uuid,_tenant uuid,_permissao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.tenant_usuarios tu WHERE tu.user_id=_ator AND tu.tenant_id=_tenant AND tu.ativo AND (tu.papel='dono' OR _permissao=ANY(tu.permissoes)))
$$;
REVOKE ALL ON FUNCTION public.financeiro_tem_permissao(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.financeiro_tem_permissao(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.preparar_comanda_segura(_ator uuid,_agendamento_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.agendamentos%ROWTYPE; s public.servicos%ROWTYPE; cfg public.configuracoes_financeiras%ROWTYPE; cid uuid;
BEGIN
 SELECT * INTO a FROM public.agendamentos WHERE id=_agendamento_id FOR UPDATE;
 IF a.id IS NULL OR NOT public.financeiro_tem_permissao(_ator,a.tenant_id,'confirmar_pagamento') THEN RAISE EXCEPTION 'sem permissao'; END IF;
 IF a.status IN ('cancelado','falta') THEN RAISE EXCEPTION 'agendamento nao pode ser atendido'; END IF;
 SELECT id INTO cid FROM public.comandas WHERE agendamento_id=a.id;
 IF cid IS NOT NULL THEN RETURN cid; END IF;
 INSERT INTO public.configuracoes_financeiras(tenant_id) VALUES(a.tenant_id) ON CONFLICT DO NOTHING;
 SELECT * INTO cfg FROM public.configuracoes_financeiras WHERE tenant_id=a.tenant_id;
 INSERT INTO public.comandas(tenant_id,cliente_id,profissional_id,agendamento_id,status,aberta_por) VALUES(a.tenant_id,a.cliente_id,a.profissional_id,a.id,'em_atendimento',_ator) RETURNING id INTO cid;
 IF a.servico_id IS NOT NULL THEN SELECT * INTO s FROM public.servicos WHERE id=a.servico_id AND tenant_id=a.tenant_id; INSERT INTO public.comanda_itens(comanda_id,tipo,servico_id,descricao,quantidade,valor_unitario_centavos,valor_total_centavos,comissao_percentual,comissao_centavos) VALUES(cid,'servico',s.id,s.nome,1,a.valor_centavos,a.valor_centavos,COALESCE(s.comissao_percentual,cfg.comissao_servico_percentual),round(a.valor_centavos*COALESCE(s.comissao_percentual,cfg.comissao_servico_percentual)/100.0)); END IF;
 UPDATE public.agendamentos SET status='confirmado' WHERE id=a.id AND status='pendente'; RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.preparar_comanda_segura(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preparar_comanda_segura(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.salvar_comanda_segura(_ator uuid,_comanda_id uuid,_itens jsonb,_desconto_centavos integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.comandas%ROWTYPE; cfg public.configuracoes_financeiras%ROWTYPE; item jsonb; s public.servicos%ROWTYPE; p public.produtos%ROWTYPE; subtotal integer:=0; total integer; base integer; pct numeric; comissao_total integer:=0;
BEGIN
 SELECT * INTO c FROM public.comandas WHERE id=_comanda_id FOR UPDATE;
 IF c.id IS NULL OR NOT public.financeiro_tem_permissao(_ator,c.tenant_id,'confirmar_pagamento') THEN RAISE EXCEPTION 'sem permissao'; END IF;
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
REVOKE ALL ON FUNCTION public.salvar_comanda_segura(uuid,uuid,jsonb,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_comanda_segura(uuid,uuid,jsonb,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_comanda_segura(_ator uuid,_comanda_id uuid,_forma text,_somente_preparar_pix boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.comandas%ROWTYPE; pg uuid; sessao uuid; resumo text; it public.comanda_itens%ROWTYPE;
BEGIN
 SELECT * INTO c FROM public.comandas WHERE id=_comanda_id FOR UPDATE; IF c.id IS NULL OR NOT public.financeiro_tem_permissao(_ator,c.tenant_id,'confirmar_pagamento') THEN RAISE EXCEPTION 'sem permissao'; END IF;
 IF c.status IN ('paga','fiado') THEN RETURN jsonb_build_object('ok',true,'idempotente',true,'status',c.status); END IF;
 IF c.status<>'aguardando_pagamento' AND NOT (c.status='aguardando_confirmacao_pix' AND _forma='pix') THEN RAISE EXCEPTION 'comanda nao esta pronta para pagamento'; END IF;
 IF _forma NOT IN ('pix','dinheiro','cartao','fiado') THEN RAISE EXCEPTION 'forma invalida'; END IF;
 IF _forma='pix' AND _somente_preparar_pix THEN INSERT INTO public.pagamentos(tenant_id,comanda_id,forma_pagamento,valor_centavos,status,criado_por) VALUES(c.tenant_id,c.id,'pix',c.total_centavos,'aguardando_confirmacao',_ator) RETURNING id INTO pg; UPDATE public.comandas SET status='aguardando_confirmacao_pix',atualizado_em=now() WHERE id=c.id; RETURN jsonb_build_object('ok',true,'status','aguardando_confirmacao_pix','pagamento_id',pg); END IF;
 SELECT id INTO pg FROM public.pagamentos WHERE comanda_id=c.id AND status='aguardando_confirmacao' ORDER BY criado_em DESC LIMIT 1;
 IF pg IS NULL THEN INSERT INTO public.pagamentos(tenant_id,comanda_id,forma_pagamento,valor_centavos,status,criado_por,confirmado_por,confirmado_em) VALUES(c.tenant_id,c.id,_forma,c.total_centavos,'confirmado',_ator,_ator,now()) RETURNING id INTO pg; ELSE UPDATE public.pagamentos SET status='confirmado',confirmado_por=_ator,confirmado_em=now() WHERE id=pg; END IF;
 SELECT id INTO sessao FROM public.caixa_sessoes WHERE tenant_id=c.tenant_id AND status='aberto'; SELECT string_agg(descricao || CASE WHEN quantidade>1 THEN ' x'||quantidade ELSE '' END,' + ') INTO resumo FROM public.comanda_itens WHERE comanda_id=c.id;
 IF _forma='fiado' THEN INSERT INTO public.fiados(tenant_id,comanda_id,cliente_id,profissional_id,valor_centavos,saldo_centavos,criado_por) VALUES(c.tenant_id,c.id,c.cliente_id,c.profissional_id,c.total_centavos,c.total_centavos,_ator); UPDATE public.comandas SET status='fiado',finalizada_por=_ator,finalizada_em=now(),atualizado_em=now() WHERE id=c.id;
 ELSE INSERT INTO public.caixa_movimentos(tenant_id,caixa_sessao_id,comanda_id,pagamento_id,cliente_id,profissional_id,tipo,categoria,descricao,valor_centavos,forma_pagamento,criado_por) VALUES(c.tenant_id,sessao,c.id,pg,c.cliente_id,c.profissional_id,'entrada','comanda',COALESCE(resumo,'Comanda'),c.total_centavos,_forma,_ator); UPDATE public.comandas SET status='paga',finalizada_por=_ator,finalizada_em=now(),atualizado_em=now() WHERE id=c.id; END IF;
 FOR it IN SELECT * FROM public.comanda_itens WHERE comanda_id=c.id LOOP
  IF it.tipo='produto' THEN UPDATE public.produtos SET quantidade=quantidade-it.quantidade WHERE id=it.produto_id AND (NOT controla_estoque OR quantidade>=it.quantidade); IF NOT FOUND THEN RAISE EXCEPTION 'estoque insuficiente'; END IF; END IF;
  IF c.profissional_id IS NOT NULL AND it.comissao_centavos>0 THEN INSERT INTO public.comissoes(tenant_id,comanda_id,item_comanda_id,profissional_id,tipo_item,base_centavos,percentual,valor_centavos) VALUES(c.tenant_id,c.id,it.id,c.profissional_id,it.tipo,it.valor_total_centavos,it.comissao_percentual,it.comissao_centavos); END IF;
 END LOOP;
 IF c.agendamento_id IS NOT NULL THEN UPDATE public.agendamentos SET status='concluido',forma_pagamento=CASE WHEN _forma IN ('dinheiro','cartao') THEN 'balcao' ELSE _forma END,pagamento_confirmado_em=CASE WHEN _forma='fiado' THEN NULL ELSE now() END,pagamento_confirmado_por=CASE WHEN _forma='fiado' THEN NULL ELSE _ator END WHERE id=c.agendamento_id; END IF;
 INSERT INTO public.auditoria_da_barbearia(tenant_id,ator_user_id,acao,alvo,detalhes) VALUES(c.tenant_id,_ator,'financeiro.comanda_finalizada',c.id::text,jsonb_build_object('forma',_forma,'total_centavos',c.total_centavos,'pagamento_id',pg));
 RETURN jsonb_build_object('ok',true,'status',CASE WHEN _forma='fiado' THEN 'fiado' ELSE 'paga' END,'pagamento_id',pg);
END $$;
REVOKE ALL ON FUNCTION public.confirmar_pagamento_comanda_segura(uuid,uuid,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_comanda_segura(uuid,uuid,text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.salvar_configuracao_financeira_segura(_ator uuid,_tenant uuid,_pix_ativo boolean,_pix_chave text,_pix_tipo text,_pix_whatsapp text,_comissao_servico numeric,_comissao_produto numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.financeiro_tem_permissao(_ator,_tenant,'comissao_configurar') THEN RAISE EXCEPTION 'sem permissao'; END IF;
 IF _comissao_servico NOT BETWEEN 0 AND 100 OR _comissao_produto NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'percentual invalido'; END IF;
 INSERT INTO public.configuracoes_financeiras(tenant_id,pix_ativo,pix_chave,pix_tipo,pix_whatsapp,comissao_servico_percentual,comissao_produto_percentual) VALUES(_tenant,_pix_ativo,NULLIF(trim(_pix_chave),''),_pix_tipo,NULLIF(regexp_replace(_pix_whatsapp,'\D','','g'),''),_comissao_servico,_comissao_produto) ON CONFLICT(tenant_id) DO UPDATE SET pix_ativo=excluded.pix_ativo,pix_chave=excluded.pix_chave,pix_tipo=excluded.pix_tipo,pix_whatsapp=excluded.pix_whatsapp,comissao_servico_percentual=excluded.comissao_servico_percentual,comissao_produto_percentual=excluded.comissao_produto_percentual,atualizado_em=now();
 INSERT INTO public.auditoria_da_barbearia(tenant_id,ator_user_id,acao,alvo,detalhes) VALUES(_tenant,_ator,'financeiro.configuracao',_tenant::text,jsonb_build_object('pix_ativo',_pix_ativo,'comissao_servico',_comissao_servico,'comissao_produto',_comissao_produto));
END $$;
REVOKE ALL ON FUNCTION public.salvar_configuracao_financeira_segura(uuid,uuid,boolean,text,text,text,numeric,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_configuracao_financeira_segura(uuid,uuid,boolean,text,text,text,numeric,numeric) TO service_role;