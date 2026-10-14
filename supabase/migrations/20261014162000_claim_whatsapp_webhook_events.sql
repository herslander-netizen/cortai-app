-- Claim atômico da caixa de entrada Meta/Lovable para impedir que duas
-- execuções processem simultaneamente a mesma entrega. Não aplicar em produção
-- sem revisão e execução explícita da migração.
ALTER TABLE public.whatsapp_webhook_events
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_claim_idx
  ON public.whatsapp_webhook_events (processing_started_at)
  WHERE processed_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_whatsapp_webhook_event(
  _id UUID,
  _stale_before TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_webhook_events
  SET processing_started_at = now()
  WHERE id = _id
    AND processed_at IS NULL
    AND (
      processing_started_at IS NULL
      OR processing_started_at < _stale_before
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_webhook_event(UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_whatsapp_webhook_event(UUID, TIMESTAMPTZ) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_webhook_event(UUID, TIMESTAMPTZ) TO service_role;
