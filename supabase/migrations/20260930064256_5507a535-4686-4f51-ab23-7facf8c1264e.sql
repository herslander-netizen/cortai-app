CREATE OR REPLACE FUNCTION public.registrar_avaliacao_publica_atomica(
  _token_hash text,
  _nota integer,
  _comentario text,
  _dimensoes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  convite public.convites_de_avaliacao%ROWTYPE;
  ag public.agendamentos%ROWTYPE;
  link_publico text;
BEGIN
  IF _nota < 1 OR _nota > 5 THEN
    RAISE EXCEPTION 'Nota inválida';
  END IF;

  IF _comentario IS NOT NULL AND char_length(_comentario) > 400 THEN
    RAISE EXCEPTION 'Comentário muito longo';
  END IF;

  SELECT * INTO convite
  FROM public.convites_de_avaliacao
  WHERE token_hash = _token_hash
  FOR UPDATE;

  IF convite.id IS NULL OR convite.usado_em IS NOT NULL OR convite.expira_em <= now() THEN
    RAISE EXCEPTION 'Este convite expirou ou já foi usado.';
  END IF;

  SELECT * INTO ag
  FROM public.agendamentos
  WHERE id = convite.agendamento_id
    AND tenant_id = convite.tenant_id;

  IF ag.id IS NULL OR ag.status <> 'finalizado' THEN
    RAISE EXCEPTION 'Atendimento não elegível para avaliação.';
  END IF;

  INSERT INTO public.avaliacoes (
    tenant_id,
    agendamento_id,
    cliente_id,
    profissional_id,
    nota,
    comentario,
    dimensoes
  ) VALUES (
    convite.tenant_id,
    convite.agendamento_id,
    ag.cliente_id,
    ag.profissional_id,
    _nota,
    NULLIF(btrim(COALESCE(_comentario, '')), ''),
    COALESCE(_dimensoes, '{}'::jsonb)
  );

  UPDATE public.convites_de_avaliacao
  SET usado_em = now()
  WHERE id = convite.id;

  SELECT link_avaliacao_publica INTO link_publico
  FROM public.tenants
  WHERE id = convite.tenant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'tenant_id', convite.tenant_id,
    'positiva', _nota >= 4,
    'precisa_atencao', _nota <= 2 OR EXISTS (
      SELECT 1
      FROM jsonb_each(COALESCE(_dimensoes, '{}'::jsonb)) AS item
      WHERE jsonb_typeof(item.value) = 'number'
        AND (item.value #>> '{}')::numeric <= 2
    ),
    'link_publico', CASE WHEN _nota >= 4 THEN link_publico ELSE NULL END
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Este atendimento já foi avaliado.';
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_avaliacao_publica_atomica(text, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_avaliacao_publica_atomica(text, integer, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.registrar_avaliacao_publica_atomica(text, integer, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_avaliacao_publica_atomica(text, integer, text, jsonb) TO service_role;