-- Migration: Registrar Avaliação Pública
-- Descrição: Cria a função RPC para registro de avaliações via link público usando tokens temporários.

CREATE OR REPLACE FUNCTION public.registrar_avaliacao_publica(
  p_token_hash text,
  p_nota integer,
  p_comentario text DEFAULT NULL,
  p_dimensoes jsonb DEFAULT NULL
)
RETURNS TABLE (
  tenant_nome text,
  tenant_slug text,
  link_avaliacao_publica text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite record;
  v_agendamento record;
BEGIN
  -- 1. Buscar e travar o convite de forma atômica
  -- FOR UPDATE previne condições de corrida (race conditions) no consumo do token
  SELECT id, tenant_id, agendamento_id, expira_em, usado_em
  INTO v_convite
  FROM convites_de_avaliacao
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  -- 2. Validações de existência e integridade do token
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token de avaliação não encontrado ou inválido.' USING ERRCODE = 'P0002';
  END IF;

  IF v_convite.usado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Este convite de avaliação já foi utilizado.' USING ERRCODE = 'L0001';
  END IF;

  IF v_convite.expira_em < now() THEN
    RAISE EXCEPTION 'Este convite de avaliação expirou.' USING ERRCODE = 'L0002';
  END IF;

  -- 3. Verificar o status do agendamento
  -- Garante que o serviço realmente ocorreu antes de permitir a avaliação
  SELECT id, cliente_id, profissional_id, status 
  INTO v_agendamento
  FROM agendamentos
  WHERE id = v_convite.agendamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento associado não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_agendamento.status != 'finalizado' THEN
    RAISE EXCEPTION 'O agendamento precisa estar no status finalizado para ser avaliado.' USING ERRCODE = 'L0003';
  END IF;

  -- 4. Registrar a avaliação na tabela principal
  -- Marcamos convite_publico_enviado como true para rastreamento
  INSERT INTO avaliacoes (
    tenant_id,
    agendamento_id,
    cliente_id,
    profissional_id,
    nota,
    comentario,
    dimensoes,
    convite_publico_enviado
  ) VALUES (
    v_convite.tenant_id,
    v_convite.agendamento_id,
    v_agendamento.cliente_id,
    v_agendamento.profissional_id,
    p_nota,
    p_comentario,
    p_dimensoes,
    true
  );

  -- 5. Consumir o token para invalidar usos futuros
  UPDATE convites_de_avaliacao
  SET usado_em = now()
  WHERE id = v_convite.id;

  -- 6. Retornar informações do tenant para a página de agradecimento
  RETURN QUERY
  SELECT t.nome, t.slug, t.link_avaliacao_publica
  FROM tenants t
  WHERE t.id = v_convite.tenant_id;
END;
$$;

-- Segurança: Restringir acesso apenas ao service_role
-- Revoga acesso público e para usuários autenticados via cliente
REVOKE ALL ON FUNCTION public.registrar_avaliacao_publica(text, integer, text, jsonb) FROM public, anon, authenticated;
-- Concede acesso apenas ao papel de serviço (backend/edge functions)
GRANT EXECUTE ON FUNCTION public.registrar_avaliacao_publica(text, integer, text, jsonb) TO service_role;

-- Documentação
COMMENT ON FUNCTION public.registrar_avaliacao_publica IS 'RPC atômico para registro de avaliações via token público. Valida expiração, consumo único e status do agendamento.';
