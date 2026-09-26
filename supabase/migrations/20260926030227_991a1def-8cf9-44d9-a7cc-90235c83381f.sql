CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS encaixe boolean NOT NULL DEFAULT false;

-- Só membro da barbearia (painel) pode marcar encaixe proposital.
CREATE OR REPLACE FUNCTION public.agendamento_proteger_encaixe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.encaixe AND (TG_OP = 'INSERT' OR NOT OLD.encaixe) THEN
    IF auth.uid() IS NULL OR NOT public.is_tenant_member(NEW.tenant_id) THEN
      NEW.encaixe := false;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.agendamento_proteger_encaixe() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS agendamento_proteger_encaixe ON public.agendamentos;
CREATE TRIGGER agendamento_proteger_encaixe BEFORE INSERT OR UPDATE OF encaixe ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.agendamento_proteger_encaixe();

-- Trava definitiva: mesmo profissional não pode ter dois horários ativos sobrepostos.
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_sem_sobreposicao
EXCLUDE USING gist (
  profissional_id WITH =,
  tstzrange(inicio, fim, '[)') WITH &&
) WHERE (status IN ('agendado','pendente','confirmado','chegou','na_cadeira') AND NOT encaixe AND profissional_id IS NOT NULL);

DROP FUNCTION IF EXISTS public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text);

CREATE FUNCTION public.criar_agendamento(_tenant_id uuid, _cliente_id uuid, _profissional_id uuid, _servico_id uuid, _inicio timestamptz, _forma_pagamento text, _encaixe boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
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

  -- A trava do banco roda aqui, antes de qualquer débito: se outra pessoa pegou o
  -- horário no mesmo instante, tudo é desfeito e ninguém é cobrado.
  BEGIN
    INSERT INTO public.agendamentos (tenant_id, cliente_id, profissional_id, servico_id, inicio, fim, status, forma_pagamento, valor_centavos, encaixe)
    VALUES (_tenant_id, _cliente_id, _profissional_id, _servico_id, _inicio, v_fim, 'agendado', _forma_pagamento,
            CASE WHEN _forma_pagamento = 'credito' THEN 0 ELSE v_servico.preco_centavos END, _encaixe)
    RETURNING id INTO v_ag_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'horario ja ocupado';
  END;

  IF _forma_pagamento = 'credito' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, agendamento_id, descricao)
    VALUES (v_carteira.id, 'debito', -1, 'mensal', v_ag_id, 'Uso de 1 credito em ' || v_servico.nome);
  ELSIF _forma_pagamento = 'fiado' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, centavos_delta, origem, agendamento_id, descricao)
    VALUES (v_carteira.id, 'fiado', -v_servico.preco_centavos, 'fiado', v_ag_id, 'Fiado: ' || v_servico.nome);
  END IF;

  IF EXISTS (SELECT 1 FROM public.regras_de_plano WHERE tenant_id = _tenant_id AND tipo = 'fidelidade' AND ativo) THEN
    INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, agendamento_id, descricao)
    VALUES (v_carteira.id, 'fidelidade', 1, 'fidelidade', v_ag_id, 'Selo de fidelidade');
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
REVOKE EXECUTE ON FUNCTION public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean) TO authenticated, service_role;