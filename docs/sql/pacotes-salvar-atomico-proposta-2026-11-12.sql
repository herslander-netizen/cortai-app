-- PROPOSTA SOMENTE PARA REVISÃO/HOMOLOGAÇÃO NO POSTGRES DESCARTÁVEL.
-- NÃO aplicar diretamente em preview/produção. A aplicação exige migração
-- aditiva revisada, verificação de RLS e aprovação explícita.
-- Dependência: drizzle/migrations/0046_pacotes_e_combos.sql (tabelas e RLS).
--
-- Objetivo: substituir UPDATE -> DELETE -> INSERT feitos em três chamadas
-- HTTP por UMA transação no Postgres. Se qualquer operação falhar, rollback
-- integral. A chamada deve vir do cliente Supabase AUTENTICADO do servidor.
-- A função mantém a RLS existente (SECURITY INVOKER), nunca service_role.
CREATE OR REPLACE FUNCTION public.salvar_pacote_atomico(
  _tenant_id uuid,
  _pacote_id uuid,
  _tipo text,
  _nome text,
  _descricao text,
  _preco_centavos integer,
  _validade_dias integer,
  _destaque boolean,
  _ativo boolean,
  _itens jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $pacote$
DECLARE
  v_item jsonb;
  v_servico_id uuid;
  v_quantidade integer;
  v_preco_unitario integer;
  v_valor_avulso bigint := 0;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_quantidades integer[] := ARRAY[]::integer[];
  v_pacote_id uuid;
BEGIN
  -- Autorização independente da camada HTTP (previne chamadas diretas à RPC).
  IF (SELECT auth.uid()) IS NULL
    OR _tenant_id IS NULL
    OR NOT public.tem_alguma_permissao(
      _tenant_id, ARRAY['alterar_dados_barbearia']::text[]
    )
  THEN
    RAISE EXCEPTION 'sem permissao para alterar pacotes'
      USING ERRCODE = '42501';
  END IF;

  IF _tipo IS NULL OR _tipo NOT IN ('pacote', 'combo')
    OR _nome IS NULL OR char_length(btrim(_nome)) NOT BETWEEN 2 AND 80
    OR (_descricao IS NOT NULL AND char_length(btrim(_descricao)) > 300)
    OR _preco_centavos IS NULL OR _preco_centavos < 0
    OR _preco_centavos > 10000000
    OR _destaque IS NULL OR _ativo IS NULL
    OR (_validade_dias IS NOT NULL AND _validade_dias NOT BETWEEN 1 AND 730)
    OR (_tipo = 'combo' AND _validade_dias IS NOT NULL)
  THEN
    RAISE EXCEPTION 'dados invalidos do pacote' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(_itens) IS DISTINCT FROM 'array'
    OR jsonb_array_length(_itens) NOT BETWEEN 1 AND 12
  THEN
    RAISE EXCEPTION 'informe de 1 a 12 servicos' USING ERRCODE = '22023';
  END IF;

  -- Serialização por tenant impede interleaving de duas edições. A trava dura
  -- somente esta transação; outros estabelecimentos não são bloqueados.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('flow:pacotes:' || _tenant_id::text, 0)
  );

  FOR v_item IN
    SELECT value FROM pg_catalog.jsonb_array_elements(_itens) AS e(value)
  LOOP
    IF jsonb_typeof(v_item) <> 'object'
      OR jsonb_typeof(v_item->'servicoId') <> 'string'
      OR jsonb_typeof(v_item->'quantidade') <> 'number'
      OR (v_item->>'quantidade') !~ '^[0-9]+$'
    THEN
      RAISE EXCEPTION 'item invalido' USING ERRCODE = '22023';
    END IF;
    -- Cast UUID/inteiro invalido deve abortar a transação por inteiro.
    v_servico_id := (v_item->>'servicoId')::uuid;
    v_quantidade := (v_item->>'quantidade')::integer;
    IF v_quantidade NOT BETWEEN 1 AND 50
      OR (_tipo = 'combo' AND v_quantidade <> 1)
      OR v_servico_id = ANY(v_ids)
    THEN
      RAISE EXCEPTION 'quantidade ou servico duplicado invalido'
        USING ERRCODE = '22023';
    END IF;

    -- Bloqueia alteração concorrente de preço/desativação até concluir a venda.
    SELECT s.preco_centavos INTO v_preco_unitario
    FROM public.servicos AS s
    WHERE s.id = v_servico_id
      AND s.tenant_id = _tenant_id
      AND s.ativo = true
    FOR SHARE;
    IF NOT FOUND OR v_preco_unitario IS NULL OR v_preco_unitario < 0 THEN
      RAISE EXCEPTION 'servico nao ativo ou fora do negocio'
        USING ERRCODE = '22023';
    END IF;

    v_valor_avulso := v_valor_avulso + v_preco_unitario::bigint * v_quantidade;
    v_ids := pg_catalog.array_append(v_ids, v_servico_id);
    v_quantidades := pg_catalog.array_append(v_quantidades, v_quantidade);
  END LOOP;

  IF _preco_centavos::bigint > v_valor_avulso THEN
    RAISE EXCEPTION 'preco do conjunto superior aos servicos avulsos'
      USING ERRCODE = '22023';
  END IF;

  IF _pacote_id IS NULL THEN
    INSERT INTO public.pacotes (
      tenant_id, tipo, nome, descricao, preco_centavos, validade_dias,
      destaque, ativo
    ) VALUES (
      _tenant_id, _tipo, btrim(_nome), nullif(btrim(_descricao), ''),
      _preco_centavos, _validade_dias, _destaque, _ativo
    )
    RETURNING id INTO v_pacote_id;
  ELSE
    -- Não transformar um ID alheio/inexistente em sucesso.
    SELECT p.id INTO v_pacote_id
    FROM public.pacotes AS p
    WHERE p.id = _pacote_id AND p.tenant_id = _tenant_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'pacote nao encontrado neste negocio'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.pacotes SET
      tipo = _tipo,
      nome = btrim(_nome),
      descricao = nullif(btrim(_descricao), ''),
      preco_centavos = _preco_centavos,
      validade_dias = _validade_dias,
      destaque = _destaque,
      ativo = _ativo
    WHERE id = v_pacote_id AND tenant_id = _tenant_id;

    DELETE FROM public.pacote_itens
    WHERE pacote_id = v_pacote_id AND tenant_id = _tenant_id;
  END IF;

  -- Inserção única: falha de constraint/trigger desfaz criação ou edição,
  -- inclusive o DELETE anterior. Não há estado parcial visível ao cliente.
  INSERT INTO public.pacote_itens (
    pacote_id, tenant_id, servico_id, quantidade
  )
  SELECT v_pacote_id, _tenant_id, i.servico_id, i.quantidade
  FROM pg_catalog.unnest(v_ids, v_quantidades)
    AS i(servico_id, quantidade);

  RETURN v_pacote_id;
END;
$pacote$;

-- Evitar GRANT EXECUTE implícito a PUBLIC; nenhum acesso anônimo.
REVOKE ALL ON FUNCTION public.salvar_pacote_atomico(
  uuid, uuid, text, text, text, integer, integer, boolean, boolean, jsonb
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.salvar_pacote_atomico(
  uuid, uuid, text, text, text, integer, integer, boolean, boolean, jsonb
) TO authenticated;

-- A migração revisada deverá disparar a atualização do cache PostgREST quando
-- for aprovada. A função NÃO é aplicada neste PR aos projetos existentes.
