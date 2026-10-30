-- Horários excepcionais por data: uma linha por negócio ou profissional.
CREATE TABLE IF NOT EXISTS public.horarios_especiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dia date NOT NULL,
  profissional_id uuid REFERENCES public.profissionais(id) ON DELETE CASCADE,
  alvo_id uuid GENERATED ALWAYS AS (coalesce(profissional_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
  abre time without time zone NOT NULL,
  fecha time without time zone NOT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT horarios_especiais_janela_valida CHECK (abre < fecha),
  CONSTRAINT horarios_especiais_alvo_unico UNIQUE (tenant_id, dia, alvo_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS horarios_especiais_periodo_idx
  ON public.horarios_especiais (tenant_id, dia);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_especiais TO authenticated;
--> statement-breakpoint
GRANT ALL ON public.horarios_especiais TO service_role;
--> statement-breakpoint
ALTER TABLE public.horarios_especiais ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "membros leem horarios especiais" ON public.horarios_especiais;
--> statement-breakpoint
CREATE POLICY "membros leem horarios especiais"
  ON public.horarios_especiais FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
--> statement-breakpoint
DROP POLICY IF EXISTS "membros criam horarios especiais" ON public.horarios_especiais;
--> statement-breakpoint
CREATE POLICY "membros criam horarios especiais"
  ON public.horarios_especiais FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia')
    AND (
      profissional_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profissionais p
        WHERE p.id = horarios_especiais.profissional_id AND p.tenant_id = horarios_especiais.tenant_id
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "membros atualizam horarios especiais" ON public.horarios_especiais;
--> statement-breakpoint
CREATE POLICY "membros atualizam horarios especiais"
  ON public.horarios_especiais FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'))
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia')
    AND (
      profissional_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profissionais p
        WHERE p.id = profissional_id AND p.tenant_id = tenant_id
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "membros removem horarios especiais" ON public.horarios_especiais;
--> statement-breakpoint
CREATE POLICY "membros removem horarios especiais"
  ON public.horarios_especiais FOR DELETE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));
--> statement-breakpoint

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
  v_especial record;
  v_especial_proprio boolean := false;
  v_escala record;
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
  -- Agendamento de balcão sem cliente continua valendo (0039).
  IF _cliente_id IS NOT NULL THEN
    SELECT * INTO v_cliente FROM public.clientes WHERE id = _cliente_id AND tenant_id = _tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'cliente nao encontrado'; END IF;
  ELSIF _forma_pagamento <> 'balcao' THEN
    RAISE EXCEPTION 'cliente obrigatorio para esta forma de pagamento';
  END IF;

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

    -- O especial do profissional prevalece; sem ele, usa-se o especial do negócio;
    -- sem nenhum dos dois, mantém-se exatamente a regra semanal (inclusive virada de dia).
    SELECT abre, fecha INTO v_especial
      FROM public.horarios_especiais
      WHERE tenant_id = _tenant_id
        AND dia = v_local::date
        AND profissional_id = _profissional_id;
    IF FOUND THEN
      v_especial_proprio := true;
    ELSE
      SELECT abre, fecha INTO v_especial
        FROM public.horarios_especiais
        WHERE tenant_id = _tenant_id
          AND dia = v_local::date
          AND profissional_id IS NULL;
    END IF;

    IF v_especial.abre IS NOT NULL THEN
      v_base := date_trunc('day', v_local);
      v_abre := v_base + v_especial.abre;
      v_fecha := v_base + v_especial.fecha;
      -- Quando a exceção é do negócio, a escala individual continua valendo.
      -- Só o especial próprio substitui a escala do profissional nesta data.
      IF NOT v_especial_proprio THEN
        SELECT trabalha, abre, fecha INTO v_escala
          FROM public.escalas_de_profissional
          WHERE tenant_id = _tenant_id
            AND profissional_id = _profissional_id
            AND dia_semana = extract(dow FROM v_local)::int
          LIMIT 1;
        IF FOUND THEN
          IF v_escala.trabalha IS DISTINCT FROM true
            OR v_escala.abre IS NULL OR v_escala.fecha IS NULL THEN
            RAISE EXCEPTION 'fora do horario de funcionamento';
          END IF;
          v_pi := v_base + v_escala.abre;
          v_pf := v_base + v_escala.fecha
            + CASE WHEN v_escala.fecha <= v_escala.abre THEN interval '1 day' ELSE interval '0' END;
          IF v_local < v_pi OR v_local + v_dur > v_pf THEN
            RAISE EXCEPTION 'fora do horario de funcionamento';
          END IF;
        END IF;
      END IF;
      IF v_local >= v_abre AND v_local + v_dur <= v_fecha THEN
        -- A pausa semanal continua valendo na data especial, se estiver configurada.
        SELECT * INTO v_h
          FROM public.horarios_de_funcionamento
          WHERE tenant_id = _tenant_id
            AND dia_semana = extract(dow FROM v_local)::int
          LIMIT 1;
        IF FOUND AND v_h.intervalo_inicio IS NOT NULL AND v_h.intervalo_fim IS NOT NULL THEN
          v_pi := v_base + v_h.intervalo_inicio
            + CASE WHEN v_h.intervalo_inicio < v_h.abre THEN interval '1 day' ELSE interval '0' END;
          v_pf := v_base + v_h.intervalo_fim
            + CASE WHEN v_h.intervalo_fim < v_h.abre THEN interval '1 day' ELSE interval '0' END;
          IF v_local < v_pf AND v_local + v_dur > v_pi THEN
            RAISE EXCEPTION 'fora do horario de funcionamento';
          END IF;
        END IF;
        v_ok := true;
      END IF;
    ELSE
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
    END IF;
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

  IF _cliente_id IS NOT NULL THEN
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