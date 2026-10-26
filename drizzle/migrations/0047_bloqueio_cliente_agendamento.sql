-- Bloqueio explícito de novos agendamentos por cliente.
-- Não arquiva o cliente, não remove histórico e não cancela agendamentos existentes.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS agendamento_bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agendamento_bloqueado_em timestamptz,
  ADD COLUMN IF NOT EXISTS agendamento_bloqueado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agendamento_bloqueio_motivo text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.clientes'::regclass
      AND conname = 'clientes_agendamento_bloqueio_motivo_limite'
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_agendamento_bloqueio_motivo_limite
      CHECK (agendamento_bloqueio_motivo IS NULL OR char_length(agendamento_bloqueio_motivo) <= 300);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.impedir_agendamento_cliente_bloqueado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_bloqueado boolean;
BEGIN
  IF NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.cliente_id IS NOT DISTINCT FROM OLD.cliente_id THEN
    RETURN NEW;
  END IF;

  SELECT c.agendamento_bloqueado
    INTO v_bloqueado
    FROM public.clientes c
   WHERE c.id = NEW.cliente_id
     AND c.tenant_id = NEW.tenant_id;

  IF COALESCE(v_bloqueado, false) THEN
    RAISE EXCEPTION 'cliente bloqueado para novos agendamentos';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.impedir_agendamento_cliente_bloqueado() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_impedir_agendamento_cliente_bloqueado
  BEFORE INSERT OR UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.impedir_agendamento_cliente_bloqueado();

COMMENT ON COLUMN public.clientes.agendamento_bloqueado IS
  'Impede novos agendamentos para o cliente; não altera atendimentos existentes nem o arquivamento.';
COMMENT ON COLUMN public.clientes.agendamento_bloqueio_motivo IS
  'Motivo interno do bloqueio de novos agendamentos; não deve ser exposto à página pública.';
