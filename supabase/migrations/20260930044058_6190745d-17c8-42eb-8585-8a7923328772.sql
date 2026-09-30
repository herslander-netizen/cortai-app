ALTER TABLE public.conexoes_whatsapp ADD COLUMN IF NOT EXISTS meta_phone_number_id text;
CREATE UNIQUE INDEX IF NOT EXISTS conexoes_whatsapp_meta_phone_unico ON public.conexoes_whatsapp (meta_phone_number_id) WHERE meta_phone_number_id IS NOT NULL;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS janela_agendamento_dias integer NOT NULL DEFAULT 30;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS passo_horarios_min integer NOT NULL DEFAULT 30;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_janela_agendamento_chk CHECK (janela_agendamento_dias BETWEEN 7 AND 90);
ALTER TABLE public.tenants ADD CONSTRAINT tenants_passo_horarios_chk CHECK (passo_horarios_min IN (15, 20, 30, 40));

CREATE OR REPLACE FUNCTION public.criar_barbearia(_nome text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _id uuid;
  _uid uuid := auth.uid();
  _slug text;
begin
  if _uid is null then raise exception 'sem sessao'; end if;
  if exists (select 1 from public.tenant_usuarios where user_id = _uid) then
    raise exception 'ja vinculado a uma barbearia';
  end if;
  _slug := trim(both '-' from regexp_replace(lower(unaccent_placeholder(_nome)), '[^a-z0-9]+', '-', 'g'));
  if _slug = '' then _slug := 'barbearia'; end if;
  if exists (select 1 from public.tenants where slug = _slug) then
    _slug := _slug || '-' || substr(md5(random()::text), 1, 4);
  end if;
  insert into public.tenants (nome, slug) values (_nome, _slug) returning id into _id;
  insert into public.tenant_usuarios (tenant_id, user_id, papel) values (_id, _uid, 'dono');
  insert into public.horarios_de_funcionamento (tenant_id, dia_semana, fechado, abre, fecha)
  select _id, d, d = 0, '09:00', '19:00' from generate_series(0, 6) d
  on conflict (tenant_id, dia_semana) do nothing;
  return _id;
end;
$function$;

DROP FUNCTION IF EXISTS public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean);

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
        IF v_h.intervalo_inicio IS NOT NULL AND v_h.intervalo_fim IS NOT NULL THEN
          v_pi := v_base + v_h.intervalo_inicio + CASE WHEN v_h.intervalo_inicio < v_h.abre THEN interval '1 day' ELSE interval '0' END;
          v_pf := v_base + v_h.intervalo_fim + CASE WHEN v_h.intervalo_fim < v_h.abre THEN interval '1 day' ELSE interval '0' END;
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

REVOKE EXECUTE ON FUNCTION public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean, boolean) TO authenticated, service_role;