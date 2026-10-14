-- Add a fencing token to atomic webhook claims. A worker that loses its lease
-- cannot mark the event complete or clear a newer worker's claim.
-- Do not apply in production without explicit review and approval.

BEGIN;

ALTER TABLE public.whatsapp_webhook_events
  ADD COLUMN IF NOT EXISTS processing_token UUID;

DROP FUNCTION IF EXISTS public.claim_whatsapp_webhook_event(UUID, TIMESTAMPTZ);

CREATE FUNCTION public.claim_whatsapp_webhook_event(
  _id UUID,
  _stale_before TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_claim UUID := gen_random_uuid();
BEGIN
  UPDATE public.whatsapp_webhook_events
  SET
    processing_started_at = now(),
    processing_token = token_claim
  WHERE id = _id
    AND processed_at IS NULL
    AND (
      processing_started_at IS NULL
      OR processing_started_at < _stale_before
    )
  RETURNING processing_token INTO token_claim;

  IF FOUND THEN
    RETURN token_claim;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_webhook_event(UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_whatsapp_webhook_event(UUID, TIMESTAMPTZ) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_webhook_event(UUID, TIMESTAMPTZ) TO service_role;

COMMIT;
