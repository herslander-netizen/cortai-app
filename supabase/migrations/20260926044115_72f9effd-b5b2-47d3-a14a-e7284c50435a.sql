ALTER TABLE public.envios_de_whatsapp
  ADD COLUMN IF NOT EXISTS canal text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS aguarda_resposta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acoes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS valido_ate timestamptz,
  ADD COLUMN IF NOT EXISTS respondido_em timestamptz,
  ADD COLUMN IF NOT EXISTS mensagem_externa_id text;
CREATE INDEX IF NOT EXISTS envios_whatsapp_abertos_idx
  ON public.envios_de_whatsapp (telefone, valido_ate)
  WHERE aguarda_resposta AND respondido_em IS NULL;
CREATE INDEX IF NOT EXISTS envios_whatsapp_msg_ext_idx
  ON public.envios_de_whatsapp (mensagem_externa_id) WHERE mensagem_externa_id IS NOT NULL;