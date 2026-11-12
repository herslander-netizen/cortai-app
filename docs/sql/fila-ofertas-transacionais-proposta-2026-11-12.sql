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
  v_o public.ofertas_da_fila%ROWTYPE;
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

  -- O cliente ainda pertence a este tenant. Não confiar apenas no ID da fila.
  IF NOT EXISTS (
    SELECT 1 FROM public.clientes
    WHERE id = v_f.cliente_id AND tenant_id = _tenant_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'cliente_indisponivel');
  END IF;

  INSERT INTO public.ofertas_da_fila (
    tenant_id, fila_id, agendamento_liberado_id, profissional_id,
    servico_id, inicio, fim, expira_em
  ) VALUES (
    _tenant_id, _fila_id, _agendamento_liberado_id, _profissional_id,
    _servico_id, _inicio, _fim, _expira_em
  ) RETURNING * INTO v_o;

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

  IF FOUND AND v_f.oferta_atual_id = v_o.id AND v_f.status = 'avisado' THEN
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

COMMIT;
