-- Série recorrente operacional: o atendimento original é a primeira ocorrência.
-- Todas as ocorrências futuras são criadas em uma única transação; um conflito desfaz a série inteira.
CREATE TABLE IF NOT EXISTS public.agendamento_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agendamento_base_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE RESTRICT,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  profissional_id uuid NOT NULL REFERENCES public.profissionais(id) ON DELETE RESTRICT,
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  periodicidade text NOT NULL CHECK (periodicidade IN ('semanal', 'quinzenal', 'mensal')),
  ocorrencias_planejadas integer NOT NULL CHECK (ocorrencias_planejadas BETWEEN 2 AND 52),
  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agendamento_base_id)
);
CREATE INDEX IF NOT EXISTS idx_agendamento_series_tenant
  ON public.agendamento_series (tenant_id, ativo, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.agendamento_serie_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  serie_id uuid NOT NULL REFERENCES public.agendamento_series(id) ON DELETE CASCADE,
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE RESTRICT,
  ordem integer NOT NULL CHECK (ordem BETWEEN 1 AND 52),
  inicio timestamptz NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (serie_id, ordem),
  UNIQUE (agendamento_id)
);
CREATE INDEX IF NOT EXISTS idx_agendamento_serie_ocorrencias_tenant
  ON public.agendamento_serie_ocorrencias (tenant_id, serie_id, ordem);

REVOKE ALL ON public.agendamento_series, public.agendamento_serie_ocorrencias FROM anon, authenticated;
GRANT ALL ON public.agendamento_series, public.agendamento_serie_ocorrencias TO service_role;
ALTER TABLE public.agendamento_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamento_serie_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.criar_serie_agendamentos(
  _tenant_id uuid,
  _agendamento_base_id uuid,
  _periodicidade text,
  _inicios timestamptz[],
  _criado_por uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base public.agendamentos%ROWTYPE;
  v_serie uuid;
  v_inicio timestamptz;
  v_inicio_anterior timestamptz;
  v_resultado jsonb;
  v_novo_id uuid;
  v_ordem integer := 1;
  v_ids uuid[];
  v_total integer;
BEGIN
  IF _periodicidade NOT IN ('semanal', 'quinzenal', 'mensal') THEN
    RAISE EXCEPTION 'periodicidade invalida';
  END IF;
  v_total := COALESCE(array_length(_inicios, 1), 0);
  IF v_total < 1 OR v_total > 51 THEN
    RAISE EXCEPTION 'quantidade de ocorrencias fora da faixa';
  END IF;

  SELECT * INTO v_base
    FROM public.agendamentos
   WHERE id = _agendamento_base_id
     AND tenant_id = _tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'atendimento base nao encontrado';
  END IF;
  IF v_base.cliente_id IS NULL OR v_base.profissional_id IS NULL OR v_base.servico_id IS NULL THEN
    RAISE EXCEPTION 'serie exige cliente, profissional e servico';
  END IF;
  IF v_base.encaixe THEN
    RAISE EXCEPTION 'atendimento avulso nao inicia serie';
  END IF;
  IF v_base.status IN ('cancelado', 'nao_compareceu', 'remarcado', 'estornado') THEN
    RAISE EXCEPTION 'atendimento encerrado nao inicia serie';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.agendamento_series
     WHERE agendamento_base_id = _agendamento_base_id
  ) THEN
    RAISE EXCEPTION 'atendimento ja pertence a uma serie';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.agendamento_serie_ocorrencias o
     WHERE o.agendamento_id = _agendamento_base_id
       AND o.tenant_id = _tenant_id
  ) THEN
    RAISE EXCEPTION 'atendimento ja pertence a uma serie';
  END IF;

  INSERT INTO public.agendamento_series (
    tenant_id, agendamento_base_id, cliente_id, profissional_id, servico_id,
    periodicidade, ocorrencias_planejadas, criado_por
  )
  VALUES (
    _tenant_id, v_base.id, v_base.cliente_id, v_base.profissional_id, v_base.servico_id,
    _periodicidade, v_total + 1, _criado_por
  )
  RETURNING id INTO v_serie;

  UPDATE public.agendamentos
     SET recorrencia = _periodicidade
   WHERE id = v_base.id
     AND tenant_id = _tenant_id;

  INSERT INTO public.agendamento_serie_ocorrencias (
    tenant_id, serie_id, agendamento_id, ordem, inicio
  )
  VALUES (_tenant_id, v_serie, v_base.id, 1, v_base.inicio);
  v_ids := ARRAY[v_base.id]::uuid[];
  v_inicio_anterior := v_base.inicio;

  FOREACH v_inicio IN ARRAY _inicios LOOP
    IF v_inicio IS NULL OR v_inicio <= now() THEN
      RAISE EXCEPTION 'ocorrencia deve estar no futuro';
    END IF;
    IF v_inicio <= v_inicio_anterior THEN
      RAISE EXCEPTION 'datas da serie devem estar em ordem crescente';
    END IF;

    -- Mesmo motor transacional: escala, horários, bloqueios, carteira e sobreposição.
    v_resultado := public.criar_agendamento(
      _tenant_id,
      v_base.cliente_id,
      v_base.profissional_id,
      v_base.servico_id,
      v_inicio,
      -- Pagamento no atendimento futuro: sem debitar créditos/saldo ou lançar fiado antecipadamente.
      'balcao',
      false,
      true
    );
    v_novo_id := (v_resultado ->> 'agendamento_id')::uuid;
    UPDATE public.agendamentos
       SET recorrencia = _periodicidade
     WHERE id = v_novo_id
       AND tenant_id = _tenant_id;

    v_ordem := v_ordem + 1;
    INSERT INTO public.agendamento_serie_ocorrencias (
      tenant_id, serie_id, agendamento_id, ordem, inicio
    )
    VALUES (_tenant_id, v_serie, v_novo_id, v_ordem, v_inicio);
    v_ids := array_append(v_ids, v_novo_id);
    v_inicio_anterior := v_inicio;
  END LOOP;

  RETURN jsonb_build_object(
    'serie_id', v_serie,
    'total_ocorrencias', v_ordem,
    'agendamento_ids', v_ids
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_serie_agendamentos(uuid, uuid, text, timestamptz[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_serie_agendamentos(uuid, uuid, text, timestamptz[], uuid)
  TO service_role;

COMMENT ON TABLE public.agendamento_series IS
  'Séries de atendimento criadas pelo painel; ocorrências futuras são validadas pelo motor oficial.';
COMMENT ON TABLE public.agendamento_serie_ocorrencias IS
  'Vínculo individual de cada atendimento à série, incluindo o original na posição 1.';
