-- Cortaí reconstruction: critical authorization and CHECK consistency fixes.
-- Intended to run only after the reviewed schema migrations, on cortai-prod.
-- This file has NOT been applied to any database.

BEGIN;

-- Prevent direct balance manipulation through authenticated INSERTs.
-- Ledger writes must be performed only by trusted server-side RPCs/functions.
REVOKE INSERT ON TABLE public.movimentos FROM anon, authenticated;
GRANT SELECT ON TABLE public.movimentos TO authenticated;
GRANT ALL ON TABLE public.movimentos TO service_role;

-- Reconcile legacy payment/movement CHECK constraints with values used by
-- the current server-side scheduling functions. Remove only CHECK constraints
-- whose expressions mention these specific columns, regardless of generated name.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN (
        'public.agendamentos'::regclass,
        'public.movimentos'::regclass
      )
      AND (
        (conrelid = 'public.agendamentos'::regclass AND pg_get_constraintdef(oid) ILIKE '%forma_pagamento%')
        OR
        (conrelid = 'public.movimentos'::regclass AND (
          pg_get_constraintdef(oid) ILIKE '%tipo%'
          OR pg_get_constraintdef(oid) ILIKE '%origem%'
        ))
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.table_name, c.conname);
  END LOOP;
END $$;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_forma_pagamento_reconstruction_check
  CHECK (forma_pagamento IS NULL OR forma_pagamento IN
    ('credito','pix','balcao','barbearia','fiado','saldo'));

ALTER TABLE public.movimentos
  ADD CONSTRAINT movimentos_tipo_reconstruction_check
  CHECK (length(btrim(tipo)) > 0);

ALTER TABLE public.movimentos
  ADD CONSTRAINT movimentos_origem_reconstruction_check
  CHECK (origem IS NULL OR length(btrim(origem)) > 0);

COMMIT;
