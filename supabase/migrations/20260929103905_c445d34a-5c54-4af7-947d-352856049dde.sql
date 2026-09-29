CREATE OR REPLACE FUNCTION public.desfazer_inicio_rapido_seguro(
  _tenant_id uuid,
  _ator_id uuid,
  _agendamento_id uuid,
  _fila_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _apagado uuid;
  _fila_restaurada uuid;
BEGIN
  DELETE FROM public.agendamentos
   WHERE id = _agendamento_id
     AND tenant_id = _tenant_id
     AND origem = 'manual'
     AND status_alterado_por = _ator_id
     AND criado_em >= clock_timestamp() - interval '5 seconds'
  RETURNING id INTO _apagado;

  IF _apagado IS NULL THEN
    RAISE EXCEPTION 'O prazo de 5 segundos para desfazer terminou ou o atendimento já mudou.';
  END IF;

  IF _fila_id IS NOT NULL THEN
    UPDATE public.fila_de_espera
       SET status = CASE WHEN avisado_em IS NULL THEN 'aguardando' ELSE 'avisado' END
     WHERE id = _fila_id
       AND tenant_id = _tenant_id
       AND status = 'atendido'
    RETURNING id INTO _fila_restaurada;

    IF _fila_restaurada IS NULL THEN
      RAISE EXCEPTION 'A fila mudou em outro aparelho; não foi possível desfazer.';
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.desfazer_inicio_rapido_seguro(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.desfazer_inicio_rapido_seguro(uuid, uuid, uuid, uuid) TO service_role;