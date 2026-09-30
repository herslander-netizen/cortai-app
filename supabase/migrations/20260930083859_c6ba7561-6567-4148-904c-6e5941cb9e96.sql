REVOKE UPDATE ON public.tenants FROM authenticated;
GRANT UPDATE (
  nome, slug, telefone, endereco, logo_url, cor_primaria, cor_secundaria,
  cor_accent, tema, modo, assinatura_visivel, instagram, whatsapp, facebook,
  texto_boas_vindas, rotulo_carteira, ultimo_acesso_em, descricao, capa_url,
  fotos, indicacao_ativa, indicacao_codigo, indicacao_recompensa,
  link_avaliacao_publica, loja_ativa, fuso, chips_ficha,
  antecedencia_min_minutos, cancelamento_min_horas, intervalo_entre_min,
  aceita_encaixe, identidade_app, listada, segmento,
  janela_agendamento_dias, passo_horarios_min
) ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

CREATE OR REPLACE FUNCTION public.salvar_comanda_segura(
  _ator uuid,
  _comanda_id uuid,
  _itens jsonb,
  _desconto_centavos integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  c public.comandas%ROWTYPE;
  cfg public.configuracoes_financeiras%ROWTYPE;
  item jsonb;
  s public.servicos%ROWTYPE;
  p public.produtos%ROWTYPE;
  subtotal integer := 0;
  total integer;
  base integer;
  pct numeric;
  comissao_total integer := 0;
BEGIN
  PERFORM set_config('cortai.ator', _ator::text, true);
  SELECT * INTO c FROM public.comandas WHERE id = _comanda_id FOR UPDATE;
  IF c.id IS NULL OR NOT (public.financeiro_tem_permissao(_ator, c.tenant_id, 'confirmar_pagamento') OR public.eh_profissional_do(_ator, c.profissional_id)) THEN RAISE EXCEPTION 'sem permissao'; END IF;
  IF c.status NOT IN ('aberta', 'em_atendimento', 'aguardando_pagamento', 'aguardando_confirmacao_pix') THEN RAISE EXCEPTION 'comanda ja finalizada'; END IF;
  IF _desconto_centavos < 0 THEN RAISE EXCEPTION 'desconto invalido'; END IF;
  IF _desconto_centavos > 0 AND NOT public.financeiro_tem_permissao(_ator, c.tenant_id, 'conceder_desconto') THEN RAISE EXCEPTION 'sem permissao para desconto'; END IF;
  IF jsonb_typeof(_itens) <> 'array' OR jsonb_array_length(_itens) = 0 THEN RAISE EXCEPTION 'adicione ao menos um item'; END IF;

  INSERT INTO public.configuracoes_financeiras(tenant_id) VALUES (c.tenant_id) ON CONFLICT DO NOTHING;
  SELECT * INTO cfg FROM public.configuracoes_financeiras WHERE tenant_id = c.tenant_id;
  DELETE FROM public.comanda_itens WHERE comanda_id = c.id;

  FOR item IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    IF COALESCE((item->>'quantidade')::integer, 0) <= 0 THEN RAISE EXCEPTION 'quantidade invalida'; END IF;
    IF item->>'tipo' = 'servico' THEN
      SELECT * INTO s FROM public.servicos WHERE id = (item->>'id')::uuid AND tenant_id = c.tenant_id AND ativo;
      IF s.id IS NULL THEN RAISE EXCEPTION 'servico invalido'; END IF;
      base := s.preco_centavos;
      pct := COALESCE(s.comissao_percentual, cfg.comissao_servico_percentual);
      subtotal := subtotal + base * (item->>'quantidade')::integer;
      INSERT INTO public.comanda_itens(comanda_id, tipo, servico_id, descricao, quantidade, valor_unitario_centavos, valor_total_centavos, comissao_percentual, comissao_centavos)
      VALUES (c.id, 'servico', s.id, s.nome, (item->>'quantidade')::integer, base, base * (item->>'quantidade')::integer, pct, 0);
    ELSIF item->>'tipo' = 'produto' THEN
      SELECT * INTO p FROM public.produtos WHERE id = (item->>'id')::uuid AND tenant_id = c.tenant_id AND ativo FOR UPDATE;
      IF p.id IS NULL OR (p.controla_estoque AND p.quantidade < (item->>'quantidade')::integer) THEN RAISE EXCEPTION 'produto indisponivel'; END IF;
      base := p.preco_centavos;
      pct := COALESCE(p.comissao_percentual, cfg.comissao_produto_percentual);
      subtotal := subtotal + base * (item->>'quantidade')::integer;
      INSERT INTO public.comanda_itens(comanda_id, tipo, produto_id, descricao, quantidade, valor_unitario_centavos, valor_total_centavos, comissao_percentual, comissao_centavos)
      VALUES (c.id, 'produto', p.id, p.nome, (item->>'quantidade')::integer, base, base * (item->>'quantidade')::integer, pct, 0);
    ELSE
      RAISE EXCEPTION 'tipo de item invalido';
    END IF;
  END LOOP;

  IF _desconto_centavos > subtotal THEN RAISE EXCEPTION 'desconto maior que subtotal'; END IF;
  total := subtotal - _desconto_centavos;
  UPDATE public.comanda_itens i
  SET comissao_centavos = round((i.valor_total_centavos - CASE WHEN subtotal = 0 THEN 0 ELSE (_desconto_centavos::numeric * i.valor_total_centavos / subtotal) END) * i.comissao_percentual / 100.0)
  WHERE i.comanda_id = c.id;
  SELECT COALESCE(sum(comissao_centavos), 0) INTO comissao_total FROM public.comanda_itens WHERE comanda_id = c.id;
  UPDATE public.comandas
  SET subtotal_centavos = subtotal, desconto_centavos = _desconto_centavos, total_centavos = total,
      comissao_total_centavos = comissao_total,
      desconto_aplicado_por = CASE WHEN _desconto_centavos > 0 THEN _ator ELSE NULL END,
      status = 'aguardando_pagamento', atualizado_em = now()
  WHERE id = c.id;
  IF _desconto_centavos > 0 THEN
    INSERT INTO public.auditoria_da_barbearia(tenant_id, ator_user_id, acao, alvo, detalhes)
    VALUES (c.tenant_id, _ator, 'financeiro.desconto', c.id::text, jsonb_build_object('subtotal_centavos', subtotal, 'desconto_centavos', _desconto_centavos, 'total_centavos', total));
  END IF;
  RETURN jsonb_build_object('comanda_id', c.id, 'subtotal_centavos', subtotal, 'desconto_centavos', _desconto_centavos, 'total_centavos', total, 'comissao_total_centavos', comissao_total);
END
$function$;

REVOKE ALL ON FUNCTION public.salvar_comanda_segura(uuid, uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_comanda_segura(uuid, uuid, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_comanda_segura(uuid, uuid, jsonb, integer) TO service_role;