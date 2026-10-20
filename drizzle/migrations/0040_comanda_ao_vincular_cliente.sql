-- Ao vincular cliente a um agendamento criado sem ficha, prepara a comanda sem exigir nova gravação no painel.
CREATE OR REPLACE FUNCTION public.agendamento_criar_comanda_ao_vincular_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.cliente_id IS NULL AND NEW.cliente_id IS NOT NULL THEN
    PERFORM public.garantir_comanda(NEW.id, NULL);
  END IF;
  RETURN NULL;
END
$function$;

CREATE TRIGGER trg_agendamento_criar_comanda_ao_vincular
AFTER UPDATE OF cliente_id ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.agendamento_criar_comanda_ao_vincular_cliente();
