ALTER TABLE public.agendamentos
ADD COLUMN preferencias_token_hash text,
ADD COLUMN preferencias_gravacoes smallint NOT NULL DEFAULT 0;

CREATE INDEX agendamentos_preferencias_token_hash_idx
ON public.agendamentos (preferencias_token_hash)
WHERE preferencias_token_hash IS NOT NULL;

COMMENT ON COLUMN public.agendamentos.preferencias_token_hash IS 'Hash da prova de posse entregue uma única vez na confirmação pública; o token bruto nunca é persistido.';
COMMENT ON COLUMN public.agendamentos.preferencias_gravacoes IS 'Quantidade de gravações públicas de preferências aceitas para este agendamento, limitada a cinco.';

CREATE OR REPLACE FUNCTION public.salvar_preferencias_do_agendamento(
  _agendamento_id uuid,
  _token_hash text,
  _preferencias jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agendamento public.agendamentos%ROWTYPE;
  v_atuais jsonb;
  v_novas jsonb;
BEGIN
  IF _preferencias IS NULL OR jsonb_typeof(_preferencias) <> 'object' OR _preferencias = '{}'::jsonb THEN
    RAISE EXCEPTION 'solicitacao invalida';
  END IF;

  SELECT * INTO v_agendamento
  FROM public.agendamentos
  WHERE id = _agendamento_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_agendamento.preferencias_token_hash IS NULL
    OR v_agendamento.preferencias_token_hash <> _token_hash
    OR v_agendamento.status IN ('cancelado', 'remarcado', 'nao_compareceu')
    OR now() > v_agendamento.fim + interval '24 hours'
    OR v_agendamento.preferencias_gravacoes >= 5
  THEN
    RAISE EXCEPTION 'solicitacao invalida';
  END IF;

  SELECT preferencias INTO v_atuais
  FROM public.clientes
  WHERE id = v_agendamento.cliente_id
    AND tenant_id = v_agendamento.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'solicitacao invalida';
  END IF;

  SELECT COALESCE(jsonb_object_agg(novo.key, novo.value), '{}'::jsonb)
  INTO v_novas
  FROM jsonb_each(_preferencias) AS novo(key, value)
  WHERE COALESCE(btrim(v_atuais ->> novo.key), '') = '';

  UPDATE public.clientes
  SET preferencias = v_atuais || v_novas
  WHERE id = v_agendamento.cliente_id
    AND tenant_id = v_agendamento.tenant_id;

  UPDATE public.agendamentos
  SET preferencias_gravacoes = preferencias_gravacoes + 1
  WHERE id = v_agendamento.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_preferencias_do_agendamento(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_preferencias_do_agendamento(uuid, text, jsonb) TO service_role;