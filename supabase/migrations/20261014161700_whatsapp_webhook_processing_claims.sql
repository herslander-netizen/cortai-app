-- Idempotent processing claims for the Meta/Lovable webhook inbox.
-- This migration is additive and has not been applied to any database.
-- Apply only through the separately reviewed database migration process.

BEGIN;

ALTER TABLE public.whatsapp_webhook_events
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS processing_token UUID;

COMMIT;
