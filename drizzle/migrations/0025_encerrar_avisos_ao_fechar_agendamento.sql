CREATE OR REPLACE FUNCTION public.encerrar_avisos_do_agendamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('cancelado','finalizado','nao_compareceu')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.envios_de_whatsapp
       SET respondido_em = now(),
           resposta = COALESCE(resposta, 'encerrado_' || NEW.status)
     WHERE agendamento_id = NEW.id
       AND tenant_id = NEW.tenant_id
       AND aguarda_resposta = true
       AND respondido_em IS NULL
       AND NOT (COALESCE(acoes, ARRAY[]::text[]) && ARRAY['CORTAI_REMARCAR','CORTAI_AGENDAR']::text[]
                AND NOT ('CORTAI_CONFIRMAR' = ANY(COALESCE(acoes, ARRAY[]::text[]))));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.encerrar_avisos_do_agendamento() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_encerrar_avisos_do_agendamento ON public.agendamentos;
CREATE TRIGGER trg_encerrar_avisos_do_agendamento
AFTER UPDATE OF status ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.encerrar_avisos_do_agendamento();