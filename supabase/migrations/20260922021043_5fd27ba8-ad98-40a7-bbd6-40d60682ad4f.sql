CREATE TABLE public.whatsapp_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id TEXT NOT NULL UNIQUE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT
);
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX whatsapp_webhook_events_pendentes_idx ON public.whatsapp_webhook_events (received_at) WHERE processed_at IS NULL;