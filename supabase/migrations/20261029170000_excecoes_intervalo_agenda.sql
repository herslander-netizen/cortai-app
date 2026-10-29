-- Exceções de intervalo por data. Não altera os horários semanais.
CREATE TABLE IF NOT EXISTS public.excecoes_intervalo_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dia date NOT NULL,
  intervalo_inicio time NULL,
  intervalo_fim time NULL,
  atualizado_por uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT excecoes_intervalo_agenda_tenant_dia_key UNIQUE (tenant_id, dia),
  CONSTRAINT excecoes_intervalo_agenda_intervalo_par_check
    CHECK ((intervalo_inicio IS NULL) = (intervalo_fim IS NULL))
);

COMMENT ON TABLE public.excecoes_intervalo_agenda IS
  'Substitui apenas o intervalo do horário semanal para uma data local específica; ambos os horários nulos removem a pausa somente naquele dia.';

ALTER TABLE public.excecoes_intervalo_agenda ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.excecoes_intervalo_agenda FROM anon, authenticated;
GRANT SELECT ON public.excecoes_intervalo_agenda TO authenticated;
GRANT ALL ON public.excecoes_intervalo_agenda TO service_role;

DROP POLICY IF EXISTS "membro consulta excecoes de intervalo" ON public.excecoes_intervalo_agenda;
CREATE POLICY "membro consulta excecoes de intervalo"
  ON public.excecoes_intervalo_agenda
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP TRIGGER IF EXISTS excecoes_intervalo_agenda_atualizado_em ON public.excecoes_intervalo_agenda;
CREATE TRIGGER excecoes_intervalo_agenda_atualizado_em
  BEFORE UPDATE ON public.excecoes_intervalo_agenda
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();


-- O motor SQL também aplica a exceção diária ao validar uma reserva.
CREATE OR REPLACE FUNCTION public.criar_agendamento(_tenant_id uuid, _cliente_id uuid, _profissional_id uuid, _servico_id uuid, _inicio timestamp with time zone, _forma_pagamento text, _encaixe boolean DEFAULT false, _validar_regras boolean DEFAULT false)
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
  v_valor int;
  v_servidor boolean := public.chamada_do_servidor();
  v_fuso text; v_folga int; v_janela int;
  v_local timestamp; v_dur interval; v_ok boolean := false;
  v_h record; v_base timestamp; v_abre timestamp; v_fecha timestamp; v_pi timestamp; v_pf timestamp;
  v_intervalo_inicio time; v_intervalo_fim time;
BEGIN
  IF NOT v_servidor AND (auth.uid() IS NULL OR NOT public.permissao_efetiva(auth.uid(), _tenant_id, 'criar_agendamento')) THEN
    RAISE EXCEPTION 'sem permissao para agendar nesta barbearia';
  END IF;
  IF _forma_pagamento NOT IN ('credito','pix','balcao','fiado','saldo') THEN
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
  v_dur := make_interval(mins => v_servico.duracao_min);

  -- Serializa gravações do mesmo profissional: folga e horário são conferidos sem corrida.
  PERFORM pg_advisory_xact_lock(hashtextextended('agenda:' || _profissional_id::text, 0));

  IF _validar_regras AND NOT _encaixe THEN
    SELECT coalesce(fuso, 'America/Sao_Paulo'), greatest(coalesce(intervalo_entre_min, 0), 0), coalesce(janela_agendamento_dias, 30)
      INTO v_fuso, v_folga, v_janela FROM public.tenants WHERE id = _tenant_id;
    IF _inicio > now() + make_interval(days => v_janela) THEN
      RAISE EXCEPTION 'fora do periodo de agendamento';
    END IF;
    v_local := _inicio AT TIME ZONE v_fuso;
    FOR v_h IN
      SELECT h.*, (h.dia_semana <> extract(dow FROM v_local)::int) AS ontem
      FROM public.horarios_de_funcionamento h
      WHERE h.tenant_id = _tenant_id AND NOT h.fechado
        AND h.dia_semana IN (extract(dow FROM v_local)::int, extract(dow FROM v_local - interval '1 day')::int)
    LOOP
      v_base := date_trunc('day', v_local) - CASE WHEN v_h.ontem THEN interval '1 day' ELSE interval '0' END;
      v_abre := v_base + v_h.abre;
      v_fecha := v_base + v_h.fecha + CASE WHEN v_h.fecha <= v_h.abre THEN interval '1 day' ELSE interval '0' END;
      IF v_local >= v_abre AND v_local + v_dur <= v_fecha THEN
        SELECT e.intervalo_inicio, e.intervalo_fim
          INTO v_intervalo_inicio, v_intervalo_fim
          FROM public.excecoes_intervalo_agenda e
          WHERE e.tenant_id = _tenant_id AND e.dia = v_base::date;
        IF NOT FOUND THEN
          v_intervalo_inicio := v_h.intervalo_inicio;
          v_intervalo_fim := v_h.intervalo_fim;
        END IF;
        IF v_intervalo_inicio IS NOT NULL AND v_intervalo_fim IS NOT NULL THEN
          v_pi := v_base + v_intervalo_inicio + CASE WHEN v_intervalo_inicio < v_h.abre THEN interval '1 day' ELSE interval '0' END;
          v_pf := v_base + v_intervalo_fim + CASE WHEN v_intervalo_fim < v_h.abre THEN interval '1 day' ELSE interval '0' END;
          IF v_local < v_pf AND v_local + v_dur > v_pi THEN CONTINUE; END IF;
        END IF;
        v_ok := true;
        EXIT;
      END IF;
    END LOOP;
    IF NOT v_ok THEN RAISE EXCEPTION 'fora do horario de funcionamento'; END IF;

    IF EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.profissional_id = _profissional_id
        AND a.status IN ('agendado','pendente','confirmado','chegou','na_cadeira')
        AND NOT a.encaixe
        AND a.inicio < v_fim + make_interval(mins => v_folga)
        AND a.fim > _inicio - make_interval(mins => v_folga)
    ) THEN
      RAISE EXCEPTION 'horario ja ocupado';
    END IF;
  END IF;

  IF NOT _encaixe AND EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.profissional_id = _profissional_id
      AND a.status IN ('agendado','pendente','confirmado','chegou','na_cadeira')
      AND NOT a.encaixe
      AND a.inicio < v_fim AND a.fim > _inicio
  ) THEN
    RAISE EXCEPTION 'horario ja ocupado';
  END IF;

  SELECT * INTO v_carteira FROM public.carteiras WHERE cliente_id = _cliente_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.carteiras (tenant_id, cliente_id) VALUES (_tenant_id, _cliente_id) RETURNING * INTO v_carteira;
  END IF;

  IF _forma_pagamento = 'credito' THEN
    IF v_carteira.saldo_creditos < 1 THEN RAISE EXCEPTION 'sem creditos disponiveis'; END IF;
  ELSIF _forma_pagamento = 'saldo' THEN
    IF v_carteira.saldo_centavos < v_servico.preco_centavos THEN RAISE EXCEPTION 'saldo insuficiente na carteira'; END IF;
  ELSIF _forma_pagamento = 'fiado' THEN
    SELECT * INTO v_regra FROM public.regras_de_plano WHERE tenant_id = _tenant_id AND tipo = 'fiado' AND ativo LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'fiado nao disponivel'; END IF;
    v_disponivel := v_cliente.limite_fiado_centavos + LEAST(v_carteira.saldo_centavos, 0);
    IF v_servico.preco_centavos > v_disponivel AND v_regra.bloqueia_agendamento_no_limite THEN
      RAISE EXCEPTION 'limite de fiado atingido';
    END IF;
  END IF;

  v_valor := CASE WHEN _forma_pagamento = 'credito' THEN 0 ELSE v_servico.preco_centavos END;

  BEGIN
    INSERT INTO public.agendamentos (tenant_id, cliente_id, profissional_id, servico_id, inicio, fim, status, forma_pagamento, valor_centavos, encaixe, pagamento_confirmado_em)
    VALUES (_tenant_id, _cliente_id, _profissional_id, _servico_id, _inicio, v_fim, 'agendado', _forma_pagamento,
            v_valor, _encaixe, CASE WHEN _forma_pagamento = 'saldo' THEN now() ELSE NULL END)
    RETURNING id INTO v_ag_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'horario ja ocupado';
  END;

  IF _forma_pagamento = 'credito' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, agendamento_id, descricao, criado_por)
    VALUES (v_carteira.id, 'debito', -1, 'mensal', v_ag_id, 'Uso de 1 credito em ' || v_servico.nome, auth.uid());
  ELSIF _forma_pagamento = 'saldo' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, centavos_delta, origem, agendamento_id, descricao, criado_por)
    VALUES (v_carteira.id, 'debito', -v_servico.preco_centavos, 'avulso', v_ag_id, 'Pagamento com saldo: ' || v_servico.nome, auth.uid());
    PERFORM public.criar_notificacao(_tenant_id, 'pagamento', 'Pagamento recebido',
      coalesce(v_cliente.nome, 'Cliente') || ' pagou ' || to_char(v_servico.preco_centavos / 100.0, 'FM999G999D00') || ' com saldo da carteira',
      '/barbeiro/agenda');
  ELSIF _forma_pagamento = 'pix' THEN
    PERFORM public.criar_notificacao(_tenant_id, 'pix', 'Pix a confirmar',
      coalesce(v_cliente.nome, 'Cliente') || ' vai pagar ' || to_char(v_servico.preco_centavos / 100.0, 'FM999G999D00') || ' por Pix',
      '/barbeiro/agenda');
  ELSIF _forma_pagamento = 'fiado' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, centavos_delta, origem, agendamento_id, descricao, criado_por)
    VALUES (v_carteira.id, 'fiado', -v_servico.preco_centavos, 'fiado', v_ag_id, 'Fiado: ' || v_servico.nome, auth.uid());
  END IF;

  SELECT * INTO v_carteira FROM public.carteiras WHERE id = v_carteira.id;

  RETURN jsonb_build_object(
    'agendamento_id', v_ag_id, 'inicio', _inicio, 'fim', v_fim,
    'forma_pagamento', _forma_pagamento, 'valor_centavos', v_valor,
    'saldo_creditos', v_carteira.saldo_creditos, 'saldo_centavos', v_carteira.saldo_centavos,
    'fidelidade_progresso', v_carteira.fidelidade_progresso,
    'fidelidade_alvo', (SELECT fidelidade_alvo FROM public.regras_de_plano WHERE tenant_id = _tenant_id AND tipo = 'fidelidade' AND ativo LIMIT 1)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.salvar_intervalo_agenda_dia(
  _tenant_id uuid,
  _dia date,
  _acao text,
  _intervalo_inicio time without time zone,
  _intervalo_fim time without time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fuso text;
  v_hoje date;
  v_h public.horarios_de_funcionamento%ROWTYPE;
  v_tenant public.tenants%ROWTYPE;
  v_inicio time;
  v_fim time;
  v_abre timestamp without time zone;
  v_fecha timestamp without time zone;
  v_pausa_inicio timestamp without time zone;
  v_pausa_fim timestamp without time zone;
  v_inicio_iso timestamp with time zone;
  v_fim_iso timestamp with time zone;
  v_prof record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.permissao_efetiva(auth.uid(), _tenant_id, 'alterar_dados_barbearia') THEN
    RAISE EXCEPTION 'sem permissao para alterar o intervalo deste dia';
  END IF;
  IF _acao NOT IN ('salvar', 'restaurar') THEN
    RAISE EXCEPTION 'acao de intervalo invalida';
  END IF;
  IF _acao = 'salvar' AND ((_intervalo_inicio IS NULL) <> (_intervalo_fim IS NULL)) THEN
    RAISE EXCEPTION 'informe o inicio e o fim do intervalo, ou deixe os dois vazios';
  END IF;
  SELECT * INTO v_tenant FROM public.tenants WHERE id = _tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'negocio nao encontrado'; END IF;
  v_fuso := coalesce(nullif(v_tenant.fuso, ''), 'America/Sao_Paulo');
  v_hoje := (now() AT TIME ZONE v_fuso)::date;
  IF _dia < v_hoje THEN
    RAISE EXCEPTION 'ajustes de intervalo so podem ser feitos para hoje ou uma data futura';
  END IF;

  SELECT * INTO v_h
    FROM public.horarios_de_funcionamento
    WHERE tenant_id = _tenant_id
      AND dia_semana = extract(dow FROM _dia)::int;
  IF NOT FOUND OR v_h.fechado THEN
    RAISE EXCEPTION 'este dia esta fechado no horario de funcionamento';
  END IF;

  IF _acao = 'restaurar' THEN
    v_inicio := v_h.intervalo_inicio;
    v_fim := v_h.intervalo_fim;
  ELSE
    v_inicio := _intervalo_inicio;
    v_fim := _intervalo_fim;
  END IF;

  IF v_inicio IS NOT NULL AND v_fim IS NOT NULL THEN
    v_abre := _dia + v_h.abre;
    v_fecha := _dia + v_h.fecha + CASE WHEN v_h.fecha <= v_h.abre THEN interval '1 day' ELSE interval '0' END;
    v_pausa_inicio := _dia + v_inicio + CASE WHEN v_inicio < v_h.abre THEN interval '1 day' ELSE interval '0' END;
    v_pausa_fim := _dia + v_fim + CASE WHEN v_fim < v_h.abre THEN interval '1 day' ELSE interval '0' END;
    IF v_pausa_inicio <= v_abre THEN
      RAISE EXCEPTION 'o intervalo precisa comecar depois da abertura';
    END IF;
    IF v_pausa_fim <= v_pausa_inicio THEN
      RAISE EXCEPTION 'o fim precisa ser posterior ao inicio do intervalo';
    END IF;
    IF v_pausa_fim >= v_fecha THEN
      RAISE EXCEPTION 'o intervalo precisa terminar antes do fechamento';
    END IF;

    -- Mesma ordem de locks usada pela criação de agendamentos: não permite corrida
    -- entre alterar o intervalo e reservar um profissional durante essa faixa.
    FOR v_prof IN
      SELECT id FROM public.profissionais WHERE tenant_id = _tenant_id ORDER BY id
    LOOP
      PERFORM pg_advisory_xact_lock(hashtextextended('agenda:' || v_prof.id::text, 0));
    END LOOP;

    v_inicio_iso := v_pausa_inicio AT TIME ZONE v_fuso;
    v_fim_iso := v_pausa_fim AT TIME ZONE v_fuso;
    IF EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.tenant_id = _tenant_id
        AND a.status IN ('agendado','pendente','confirmado','chegou','na_cadeira')
        AND a.inicio < v_fim_iso
        AND a.fim > v_inicio_iso
    ) THEN
      RAISE EXCEPTION 'ja existe atendimento nesse periodo; remarque ou cancele antes de ajustar o intervalo';
    END IF;
  END IF;

  IF _acao = 'restaurar' THEN
    DELETE FROM public.excecoes_intervalo_agenda
      WHERE tenant_id = _tenant_id AND dia = _dia;
  ELSE
    INSERT INTO public.excecoes_intervalo_agenda
      (tenant_id, dia, intervalo_inicio, intervalo_fim, atualizado_por)
    VALUES (_tenant_id, _dia, v_inicio, v_fim, auth.uid())
    ON CONFLICT (tenant_id, dia) DO UPDATE SET
      intervalo_inicio = EXCLUDED.intervalo_inicio,
      intervalo_fim = EXCLUDED.intervalo_fim,
      atualizado_por = auth.uid(),
      atualizado_em = now();
  END IF;

  PERFORM public.registrar_auditoria_barbearia(
    _tenant_id,
    CASE WHEN _acao = 'restaurar' THEN 'agenda.intervalo_restaurado' ELSE 'agenda.intervalo_ajustado' END,
    _dia::text,
    jsonb_build_object('intervalo_inicio', v_inicio, 'intervalo_fim', v_fim, 'acao', _acao)
  );
  RETURN jsonb_build_object(
    'ok', true,
    'dia', _dia,
    'acao', _acao,
    'intervalo_inicio', v_inicio,
    'intervalo_fim', v_fim
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.salvar_intervalo_agenda_dia(uuid, date, text, time without time zone, time without time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_intervalo_agenda_dia(uuid, date, text, time without time zone, time without time zone) TO authenticated, service_role;
