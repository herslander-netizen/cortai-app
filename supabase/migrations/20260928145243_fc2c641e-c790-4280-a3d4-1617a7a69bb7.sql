ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_origem_check;
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_origem_check CHECK (origem = ANY (ARRAY['app','manual','link_publico','whatsapp']));

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS listada boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.chamada_do_servidor()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT current_user = 'service_role' OR coalesce(auth.role(), '') = 'service_role'
$$;
REVOKE EXECUTE ON FUNCTION public.chamada_do_servidor() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.criar_agendamento(_tenant_id uuid, _cliente_id uuid, _profissional_id uuid, _servico_id uuid, _inicio timestamp with time zone, _forma_pagamento text, _encaixe boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_servico public.servicos%ROWTYPE;
  v_cliente public.clientes%ROWTYPE;
  v_carteira public.carteiras%ROWTYPE;
  v_regra public.regras_de_plano%ROWTYPE;
  v_fim timestamptz;
  v_ag_id uuid;
  v_disponivel int;
  v_servidor boolean := public.chamada_do_servidor();
BEGIN
  IF NOT v_servidor AND (auth.uid() IS NULL OR NOT public.permissao_efetiva(auth.uid(), _tenant_id, 'criar_agendamento')) THEN
    RAISE EXCEPTION 'sem permissao para agendar nesta barbearia';
  END IF;
  IF _forma_pagamento NOT IN ('credito','pix','balcao','fiado') THEN
    RAISE EXCEPTION 'forma de pagamento invalida';
  END IF;
  IF _encaixe AND NOT v_servidor AND NOT public.is_tenant_member(_tenant_id) THEN
    RAISE EXCEPTION 'encaixe so pelo painel';
  END IF;

  SELECT * INTO v_servico FROM public.servicos WHERE id = _servico_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'servico nao encontrado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profissionais WHERE id = _profissional_id AND tenant_id = _tenant_id) THEN
    RAISE EXCEPTION 'profissional nao encontrado';
  END IF;

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

CREATE OR REPLACE FUNCTION public.cancelar_agendamento(_agendamento_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  a public.agendamentos%ROWTYPE;
  v_carteira public.carteiras%ROWTYPE;
  v_devolveu boolean := false;
BEGIN
  SELECT * INTO a FROM public.agendamentos WHERE id = _agendamento_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'agendamento nao encontrado'; END IF;
  IF NOT public.chamada_do_servidor() AND (auth.uid() IS NULL OR NOT public.permissao_efetiva(auth.uid(), a.tenant_id, 'cancelar_agendamento')) THEN
    RAISE EXCEPTION 'agendamento nao encontrado';
  END IF;
  IF a.status IN ('cancelado','nao_compareceu','remarcado') THEN RAISE EXCEPTION 'agendamento ja encerrado'; END IF;

  SELECT * INTO v_carteira FROM public.carteiras WHERE cliente_id = a.cliente_id AND tenant_id = a.tenant_id;

  IF a.inicio - now() > interval '4 hours' AND v_carteira.id IS NOT NULL THEN
    IF a.forma_pagamento = 'credito' THEN
      INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, agendamento_id, descricao)
      VALUES (v_carteira.id, 'credito', 1, 'ajuste', a.id, 'Devolucao de 1 credito por cancelamento com antecedencia');
      v_devolveu := true;
    ELSIF a.forma_pagamento = 'fiado' THEN
      INSERT INTO public.movimentos (carteira_id, tipo, centavos_delta, origem, agendamento_id, descricao)
      VALUES (v_carteira.id, 'fiado', a.valor_centavos, 'ajuste', a.id, 'Estorno do fiado por cancelamento com antecedencia');
      v_devolveu := true;
    END IF;
    IF EXISTS (SELECT 1 FROM public.movimentos WHERE agendamento_id = a.id AND tipo = 'fidelidade' AND creditos_delta > 0) THEN
      INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, agendamento_id, descricao)
      VALUES (v_carteira.id, 'fidelidade', -1, 'ajuste', a.id, 'Selo de fidelidade removido por cancelamento');
    END IF;
  END IF;

  UPDATE public.agendamentos SET status = 'cancelado', cancelado_em = now() WHERE id = a.id;

  SELECT * INTO v_carteira FROM public.carteiras WHERE id = v_carteira.id;

  RETURN jsonb_build_object('devolvido', v_devolveu, 'saldo_creditos', v_carteira.saldo_creditos, 'saldo_centavos', v_carteira.saldo_centavos);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancelar_agendamento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancelar_agendamento(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.chamada_do_servidor() TO authenticated, service_role;