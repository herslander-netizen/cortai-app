ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS confirmado_em timestamptz;

CREATE OR REPLACE FUNCTION public.confirmar_presenca_whatsapp(_agendamento_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.agendamentos%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'nao_encontrado'); END IF;
  IF a.status NOT IN ('agendado','chegou') OR a.inicio < now() - interval '2 hours' THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'inativo');
  END IF;
  UPDATE public.agendamentos SET confirmado_em = COALESCE(confirmado_em, now()) WHERE id = a.id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.checkin_whatsapp(_agendamento_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.agendamentos%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.agendamentos WHERE id = _agendamento_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'nao_encontrado'); END IF;
  IF a.status = 'chegou' THEN RETURN jsonb_build_object('ok', true, 'motivo', 'ja_chegou'); END IF;
  IF a.status <> 'agendado' THEN RETURN jsonb_build_object('ok', false, 'motivo', 'inativo'); END IF;
  IF now() < a.inicio - interval '30 minutes' THEN RETURN jsonb_build_object('ok', false, 'motivo', 'cedo'); END IF;
  IF now() > a.inicio + interval '15 minutes' THEN RETURN jsonb_build_object('ok', false, 'motivo', 'tarde'); END IF;
  UPDATE public.agendamentos SET status = 'chegou', confirmado_em = COALESCE(confirmado_em, now()) WHERE id = a.id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.confirmar_presenca_whatsapp(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkin_whatsapp(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_presenca_whatsapp(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.checkin_whatsapp(uuid) TO service_role;