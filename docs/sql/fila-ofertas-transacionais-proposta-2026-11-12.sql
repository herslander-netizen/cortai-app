-- PROPOSTA, NÃO É MIGRAÇÃO AUTORIZADA. NÃO EXECUTAR NA PRÉVIA/PRODUÇÃO AINDA.
-- Após a reserva de drizzle/migrations (0059+) ser liberada, gerar migração
-- aditiva com número livre, revisar o estado atual e testar num banco isolado.
-- Desenho para o esquema de cortai-preview observado em 12/11/2026.
-- Depende de alteração simultânea do backend de oferta e aceite.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- A implantação deve falhar de maneira explícita, sem inventar dono de reserva
-- quando há dados antigos já inconsistentes.
DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ofertas_da_fila
    WHERE status = 'enviada'
    GROUP BY fila_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Fila tem mais de uma oferta ativa por entrada; reconciliar antes de migrar.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.ofertas_da_fila
    WHERE status = 'enviada' AND agendamento_liberado_id IS NOT NULL
    GROUP BY agendamento_liberado_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Mais de uma oferta ativa por vaga; reconciliar antes de migrar.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.ofertas_da_fila
    WHERE status = 'enviada' AND agendamento_liberado_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Oferta ativa sem vaga de origem; reconciliar antes de migrar.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.ofertas_da_fila o
    LEFT JOIN public.fila_de_espera f
      ON f.id = o.fila_id AND f.tenant_id = o.tenant_id
    WHERE o.status = 'enviada' AND f.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Oferta ativa sem entrada no mesmo tenant.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fila_de_espera f
    LEFT JOIN public.ofertas_da_fila o
      ON o.fila_id = f.id AND o.tenant_id = f.tenant_id AND o.status = 'enviada'
    WHERE (f.status = 'avisado' AND o.id IS NULL)
       OR (o.id IS NOT NULL AND f.status <> 'avisado')
  ) THEN
    RAISE EXCEPTION 'Fila e ofertas ativas inconsistentes; reconciliar antes de migrar.';
  END IF;
END;
$preflight$;

ALTER TABLE public.fila_de_espera
  ADD COLUMN IF NOT EXISTS oferta_atual_id uuid;

DO $foreign_key$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.fila_de_espera'::regclass
      AND conname = 'fila_de_espera_oferta_atual_id_fkey'
  ) THEN
    ALTER TABLE public.fila_de_espera
      ADD CONSTRAINT fila_de_espera_oferta_atual_id_fkey
      FOREIGN KEY (oferta_atual_id) REFERENCES public.ofertas_da_fila(id)
      ON DELETE SET NULL;
  END IF;
END;
$foreign_key$;

-- Nem duas vagas podem reservar a mesma entrada ao mesmo tempo.
CREATE UNIQUE INDEX IF NOT EXISTS ofertas_da_fila_uma_ativa_por_entrada
  ON public.ofertas_da_fila (fila_id) WHERE status = 'enviada';

UPDATE public.fila_de_espera f
SET oferta_atual_id = o.id
FROM public.ofertas_da_fila o
WHERE f.id = o.fila_id
  AND f.tenant_id = o.tenant_id
  AND f.status = 'avisado'
  AND o.status = 'enviada'
  AND f.oferta_atual_id IS DISTINCT FROM o.id;

COMMENT ON COLUMN public.fila_de_espera.oferta_atual_id IS
  'Oferta que atualmente reservou esta entrada da lista de espera. Só RPCs transacionais alteram.';

-- Mesmo que a equipe use múltiplas sessões, só uma transação pode reservar a
-- entrada, e o índice parcial da vaga já existente impede oferta duplicada.
CREATE OR REPLACE FUNCTION public.reservar_oferta_da_fila(
  _tenant_id uuid,
  _fila_id uuid,
  _agendamento_liberado_id uuid,
  _profissional_id uuid,
  _servico_id uuid,
  _inicio timestamptz,
  _fim timestamptz,
  _expira_em timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $reservar$
DECLARE
  v_f public.fila_de_espera%ROWTYPE;
  v_ag public.agendamentos%ROWTYPE;
  v_s public.servicos%ROWTYPE;
  v_o public.ofertas_da_fila%ROWTYPE;
  v_margem_min integer := 0;
  v_fuso text;
  v_inicio_local timestamp without time zone;
BEGIN
  IF NOT public.chamada_do_servidor() THEN
    RAISE EXCEPTION 'somente servidor';
  END IF;
  IF _tenant_id IS NULL OR _fila_id IS NULL OR _agendamento_liberado_id IS NULL
     OR _profissional_id IS NULL OR _servico_id IS NULL OR _inicio IS NULL
     OR _fim IS NULL OR _expira_em IS NULL
     OR _inicio <= now() OR _fim <= _inicio OR _expira_em <= now()
     OR _expira_em >= _inicio
  THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'parametros_invalidos');
  END IF;

  -- Ordem de bloqueio: a entrada primeiro. A unicidade parcial fecha a
  -- segunda corrida, inclusive quando dois workers oferecem a mesma vaga.
  SELECT * INTO v_f FROM public.fila_de_espera
    WHERE id = _fila_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND OR v_f.status <> 'aguardando' OR v_f.oferta_atual_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_indisponivel');
  END IF;

  SELECT * INTO v_ag FROM public.agendamentos
    WHERE id = _agendamento_liberado_id AND tenant_id = _tenant_id
      AND profissional_id = _profissional_id
      AND inicio = _inicio AND status IN ('cancelado', 'remarcado')
    FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'vaga_indisponivel');
  END IF;

  -- Revalidar preferências da lista dentro da transação, no fuso do negócio.
  -- Janela NULL pertence à fila de chegada, nunca à espera de horário.
  IF v_f.janela_preferida IS NULL
     OR jsonb_typeof(v_f.janela_preferida) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_e_lista_de_espera');
  END IF;
  SELECT coalesce(nullif(fuso, ''), 'America/Sao_Paulo')
    INTO v_fuso FROM public.tenants WHERE id = _tenant_id;
  IF v_fuso IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'tenant_indisponivel');
  END IF;
  v_inicio_local := _inicio AT TIME ZONE v_fuso;
  IF (nullif(v_f.janela_preferida->>'dia', '') IS NOT NULL
       AND v_f.janela_preferida->>'dia' <> to_char(v_inicio_local, 'YYYY-MM-DD'))
     OR (nullif(v_f.janela_preferida->>'horario', '') IS NOT NULL
       AND v_f.janela_preferida->>'horario' <> to_char(v_inicio_local, 'HH24:MI'))
  THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'janela_incompativel');
  END IF;
  IF v_f.janela_preferida ? 'inicio' OR v_f.janela_preferida ? 'fim' THEN
    IF NOT (v_f.janela_preferida ? 'inicio' AND v_f.janela_preferida ? 'fim')
       OR jsonb_typeof(v_f.janela_preferida->'inicio') <> 'number'
       OR jsonb_typeof(v_f.janela_preferida->'fim') <> 'number' THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'janela_invalida');
    END IF;
    IF (v_f.janela_preferida->>'inicio')::numeric < 0
       OR (v_f.janela_preferida->>'fim')::numeric > 24
       OR (v_f.janela_preferida->>'inicio')::numeric >= (v_f.janela_preferida->>'fim')::numeric
       OR (v_f.janela_preferida->>'inicio')::numeric <> trunc((v_f.janela_preferida->>'inicio')::numeric)
       OR (v_f.janela_preferida->>'fim')::numeric <> trunc((v_f.janela_preferida->>'fim')::numeric) THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'janela_invalida');
    END IF;
    IF extract(hour FROM v_inicio_local)::integer < (v_f.janela_preferida->>'inicio')::integer
       OR extract(hour FROM v_inicio_local)::integer >= (v_f.janela_preferida->>'fim')::integer THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'janela_incompativel');
    END IF;
  END IF;
  -- O cliente ainda pertence a este tenant. Não confiar apenas no ID da fila.
  IF NOT EXISTS (
    SELECT 1 FROM public.clientes
    WHERE id = v_f.cliente_id AND tenant_id = _tenant_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'cliente_indisponivel');
  END IF;

  -- Uma consulta anterior do aplicativo nunca substitui validação no banco.
  IF NOT EXISTS (
    SELECT 1 FROM public.profissionais
    WHERE id = _profissional_id AND tenant_id = _tenant_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'profissional_invalido');
  END IF;
  SELECT * INTO v_s FROM public.servicos
    WHERE id = _servico_id AND tenant_id = _tenant_id AND duracao_min > 0;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'servico_invalido');
  END IF;
  IF _fim IS DISTINCT FROM _inicio + make_interval(mins => v_s.duracao_min)
     OR (
       coalesce(array_length(v_s.profissional_ids, 1), 0) > 0
       AND NOT (_profissional_id = ANY(v_s.profissional_ids))
     )
     OR (v_f.servico_id IS NOT NULL AND v_f.servico_id <> _servico_id)
     OR (
       v_f.profissional_id IS NOT NULL AND v_f.profissional_id <> _profissional_id
       AND NOT coalesce((
         SELECT espera_qualquer_profissional FROM public.tenants
         WHERE id = _tenant_id
       ), false)
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'incompativel');
  END IF;

  -- Mesma trava serializada do criar_agendamento oficial: a consulta inicial
  -- no aplicativo não basta, pois outra sessão pode ocupar o horário depois.
  PERFORM pg_advisory_xact_lock(hashtextextended('agenda:' || _profissional_id::text, 0));
  SELECT greatest(coalesce(intervalo_entre_min, 0), 0)
    INTO v_margem_min
    FROM public.tenants WHERE id = _tenant_id;
  IF EXISTS (
    SELECT 1
      FROM public.agendamentos a
     WHERE a.tenant_id = _tenant_id
       AND a.profissional_id = _profissional_id
       AND a.id IS DISTINCT FROM _agendamento_liberado_id
       AND a.status IN ('agendado', 'chegou', 'na_cadeira', 'finalizado')
       AND a.inicio < _fim + make_interval(mins => v_margem_min)
       AND a.fim > _inicio - make_interval(mins => v_margem_min)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ocupada');
  END IF;

  -- Violação de índice por corrida entre workers: a RPC retorna conflito,
  -- sem deixar uma entrada avisada sem oferta correspondente.
  BEGIN
  INSERT INTO public.ofertas_da_fila (
    tenant_id, fila_id, agendamento_liberado_id, profissional_id,
    servico_id, inicio, fim, expira_em
  ) VALUES (
    _tenant_id, _fila_id, _agendamento_liberado_id, _profissional_id,
    _servico_id, _inicio, _fim, _expira_em
  ) RETURNING * INTO v_o;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'concorrente');
  END;

  UPDATE public.fila_de_espera SET
    status = 'avisado', avisado_em = clock_timestamp(), oferta_atual_id = v_o.id
  WHERE id = v_f.id AND tenant_id = _tenant_id;

  RETURN jsonb_build_object('ok', true, 'oferta_id', v_o.id, 'token', v_o.token);
END;
$reservar$;

-- Libera APENAS a entrada que ainda aponta para esta oferta, em uma única
-- transação. Uma recusa de token velho nunca derruba uma oferta mais recente.
CREATE OR REPLACE FUNCTION public.encerrar_oferta_da_fila(
  _tenant_id uuid,
  _oferta_id uuid,
  _novo_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $encerrar$
DECLARE
  v_o public.ofertas_da_fila%ROWTYPE;
  v_f public.fila_de_espera%ROWTYPE;
  v_liberou boolean := false;
BEGIN
  IF NOT public.chamada_do_servidor() THEN
    RAISE EXCEPTION 'somente servidor';
  END IF;
  IF _novo_status NOT IN ('cancelada', 'expirada', 'recusada') THEN
    RAISE EXCEPTION 'estado inválido';
  END IF;
  SELECT * INTO v_o FROM public.ofertas_da_fila
    WHERE id = _oferta_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND OR v_o.status <> 'enviada' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'oferta_inativa');
  END IF;
  IF _novo_status = 'expirada' AND v_o.expira_em > now() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ainda_no_prazo');
  END IF;
  SELECT * INTO v_f FROM public.fila_de_espera
    WHERE id = v_o.fila_id AND tenant_id = _tenant_id FOR UPDATE;

  UPDATE public.ofertas_da_fila SET
    status = _novo_status, respondida_em = clock_timestamp()
  WHERE id = v_o.id;

  IF v_f.id IS NOT NULL AND v_f.oferta_atual_id = v_o.id AND v_f.status = 'avisado' THEN
    UPDATE public.fila_de_espera SET
      status = 'aguardando', avisado_em = NULL, oferta_atual_id = NULL
    WHERE id = v_f.id AND tenant_id = _tenant_id;
    v_liberou := true;
  END IF;
  RETURN jsonb_build_object(
    'ok', true, 'liberou_fila', v_liberou,
    'agendamento_liberado_id', v_o.agendamento_liberado_id
  );
END;
$encerrar$;

-- Substitui a função de aceite existente preservando token, idempotência,
-- criar_agendamento, confirmação e retorno usados pela interface.
CREATE OR REPLACE FUNCTION public.aceitar_oferta_da_fila(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $aceitar$
DECLARE
  v_o public.ofertas_da_fila%ROWTYPE;
  v_f public.fila_de_espera%ROWTYPE;
  v_res jsonb;
  v_ag uuid;
BEGIN
  IF NOT public.chamada_do_servidor() THEN
    RAISE EXCEPTION 'somente servidor';
  END IF;
  SELECT * INTO v_o FROM public.ofertas_da_fila
    WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  END IF;
  IF v_o.status = 'aceita' THEN
    RETURN jsonb_build_object(
      'ok', true, 'agendamento_id', v_o.agendamento_criado_id, 'repetida', true
    );
  END IF;
  IF v_o.status <> 'enviada' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', v_o.status);
  END IF;

  SELECT * INTO v_f FROM public.fila_de_espera
    WHERE id = v_o.fila_id AND tenant_id = v_o.tenant_id FOR UPDATE;
  IF NOT FOUND OR v_f.status <> 'avisado' OR v_f.oferta_atual_id IS DISTINCT FROM v_o.id THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'oferta_substituida');
  END IF;

  IF v_o.expira_em <= now() OR v_o.inicio <= now() THEN
    UPDATE public.ofertas_da_fila SET status = 'expirada', respondida_em = now()
      WHERE id = v_o.id;
    UPDATE public.fila_de_espera
      SET status = 'aguardando', avisado_em = NULL, oferta_atual_id = NULL
      WHERE id = v_f.id AND oferta_atual_id = v_o.id;
    RETURN jsonb_build_object('ok', false, 'motivo', 'expirada');
  END IF;
  BEGIN
    v_res := public.criar_agendamento(
      v_o.tenant_id, v_f.cliente_id, v_o.profissional_id,
      v_o.servico_id, v_o.inicio, 'balcao', false, true
    );
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.ofertas_da_fila SET status = 'cancelada', respondida_em = now()
      WHERE id = v_o.id;
    UPDATE public.fila_de_espera
      SET status = 'aguardando', avisado_em = NULL, oferta_atual_id = NULL
      WHERE id = v_f.id AND oferta_atual_id = v_o.id;
    RETURN jsonb_build_object('ok', false, 'motivo', 'ocupado');
  END;

  v_ag := (v_res->>'agendamento_id')::uuid;
  UPDATE public.agendamentos SET origem_fila_id = v_f.id WHERE id = v_ag;
  UPDATE public.ofertas_da_fila SET
    status = 'aceita', respondida_em = now(), agendamento_criado_id = v_ag
    WHERE id = v_o.id;
  UPDATE public.fila_de_espera SET
    status = 'atendido', oferta_atual_id = NULL
    WHERE id = v_f.id AND oferta_atual_id = v_o.id;
  RETURN jsonb_build_object('ok', true, 'agendamento_id', v_ag);
END;
$aceitar$;

-- A ação da equipe precisa respeitar a oferta em andamento. A função
-- cancela oferta e marca saída na MESMA transação, sem soltar a pessoa para
-- que outra execução a capture entre duas atualizações.
CREATE OR REPLACE FUNCTION public.retirar_entrada_da_fila(
  _tenant_id uuid,
  _fila_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $retirar$
DECLARE
  v_oferta_lida uuid;
  v_f public.fila_de_espera%ROWTYPE;
  v_o public.ofertas_da_fila%ROWTYPE;
BEGIN
  IF NOT public.chamada_do_servidor() THEN
    RAISE EXCEPTION 'somente servidor';
  END IF;
  -- A mesma ordem de locks do aceite: oferta primeiro, entrada depois.
  SELECT oferta_atual_id INTO v_oferta_lida
    FROM public.fila_de_espera
    WHERE id = _fila_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  END IF;
  IF v_oferta_lida IS NOT NULL THEN
    SELECT * INTO v_o FROM public.ofertas_da_fila
      WHERE id = v_oferta_lida AND tenant_id = _tenant_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'vinculo_inconsistente');
    END IF;
  END IF;
  SELECT * INTO v_f FROM public.fila_de_espera
    WHERE id = _fila_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND OR v_f.oferta_atual_id IS DISTINCT FROM v_oferta_lida THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'concorrente');
  END IF;
  IF v_f.status = 'saiu' THEN
    RETURN jsonb_build_object('ok', true, 'repetida', true);
  END IF;
  IF v_f.status NOT IN ('aguardando', 'avisado') THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'ja_finalizada');
  END IF;
  IF v_oferta_lida IS NOT NULL THEN
    IF v_o.fila_id <> v_f.id OR v_o.status <> 'enviada' THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'vinculo_inconsistente');
    END IF;
    UPDATE public.ofertas_da_fila
       SET status = 'cancelada', respondida_em = clock_timestamp()
     WHERE id = v_o.id AND tenant_id = _tenant_id;
  ELSIF v_f.status = 'avisado' AND v_f.janela_preferida IS NOT NULL THEN
    -- A fila de chegada (janela NULL) pode ter aviso manual, sem oferta;
    -- somente a lista de espera exige vínculo com a oferta atual.
    RETURN jsonb_build_object('ok', false, 'motivo', 'vinculo_inconsistente');
  END IF;
  UPDATE public.fila_de_espera
     SET status = 'saiu', avisado_em = NULL, oferta_atual_id = NULL
   WHERE id = v_f.id AND tenant_id = _tenant_id;
  RETURN jsonb_build_object('ok', true, 'repetida', false);
END;
$retirar$;

-- Conversão manual da lista em agendamento: somente se a entrada ainda
-- não tem oferta ativa. Uma oferta avisada precisa ser recusada/expirada
-- antes da conversão; não abrir dois caminhos concorrentes de confirmação.
CREATE OR REPLACE FUNCTION public.converter_entrada_da_fila(
  _tenant_id uuid,
  _fila_id uuid,
  _servico_id uuid,
  _profissional_id uuid,
  _inicio timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $converter$
DECLARE
  v_f public.fila_de_espera%ROWTYPE;
  v_resultado jsonb;
  v_ag uuid;
BEGIN
  IF NOT public.chamada_do_servidor() THEN
    RAISE EXCEPTION 'somente servidor';
  END IF;
  IF _inicio IS NULL OR _inicio <= now() THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'inicio_invalido');
  END IF;
  SELECT * INTO v_f FROM public.fila_de_espera
    WHERE id = _fila_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'nao_encontrada');
  END IF;
  IF v_f.status = 'avisado' OR v_f.oferta_atual_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'oferta_pendente');
  END IF;
  IF v_f.status <> 'aguardando' OR v_f.janela_preferida IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'entrada_indisponivel');
  END IF;
  -- O motor oficial aplica regras de horário, escala, serviço, plano,
  -- conflito e sua própria trava por profissional no mesmo commit.
  v_resultado := public.criar_agendamento(
    _tenant_id, v_f.cliente_id, _profissional_id,
    _servico_id, _inicio, 'balcao', false, true
  );
  IF jsonb_typeof(v_resultado) IS DISTINCT FROM 'object'
     OR v_resultado->>'agendamento_id' IS NULL THEN
    RAISE EXCEPTION 'criar_agendamento não retornou agendamento';
  END IF;
  v_ag := (v_resultado->>'agendamento_id')::uuid;
  UPDATE public.agendamentos
     SET origem = 'manual', origem_fila_id = v_f.id
   WHERE id = v_ag AND tenant_id = _tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado após criação';
  END IF;
  UPDATE public.fila_de_espera
     SET status = 'atendido', avisado_em = NULL, oferta_atual_id = NULL
   WHERE id = v_f.id AND tenant_id = _tenant_id;
  RETURN jsonb_build_object('ok', true, 'agendamento_id', v_ag);
END;
$converter$;

-- SECURITY DEFINER em schema exposto: negar a execução pública e só liberar
-- o service_role. O public route continua autenticando a chamada no servidor.
REVOKE EXECUTE ON FUNCTION public.reservar_oferta_da_fila(
  uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,timestamptz
) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.encerrar_oferta_da_fila(uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aceitar_oferta_da_fila(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_oferta_da_fila(
  uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.encerrar_oferta_da_fila(uuid,uuid,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.aceitar_oferta_da_fila(text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.retirar_entrada_da_fila(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.converter_entrada_da_fila(uuid,uuid,uuid,uuid,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retirar_entrada_da_fila(uuid,uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.converter_entrada_da_fila(uuid,uuid,uuid,uuid,timestamptz)
  TO service_role;

COMMIT;
