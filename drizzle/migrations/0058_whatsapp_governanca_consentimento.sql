-- Governança de consentimento WhatsApp (Flow).
-- Somente histórico e supressão; não altera clientes antigos nem presume consentimento.
-- A autorização deve ser concedida com origem e evidência explícitas pelo serviço do servidor.

CREATE TABLE IF NOT EXISTS public.whatsapp_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  phone_e164 text NOT NULL,
  purpose text NOT NULL,
  action text NOT NULL,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_text text,
  policy_version text NOT NULL DEFAULT 'flow-whatsapp-2026-11-05',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT whatsapp_consent_events_phone_e164_chk
    CHECK (phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  CONSTRAINT whatsapp_consent_events_purpose_chk
    CHECK (purpose IN ('avisos_agendamento', 'lista_espera', 'relacionamento', 'marketing')),
  CONSTRAINT whatsapp_consent_events_action_chk
    CHECK (action IN ('concedido', 'revogado', 'reconsentimento_solicitado')),
  CONSTRAINT whatsapp_consent_events_source_chk
    CHECK (length(trim(source)) BETWEEN 2 AND 80),
  CONSTRAINT whatsapp_consent_events_evidence_object_chk
    CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT whatsapp_consent_events_consent_text_chk
    CHECK (consent_text IS NULL OR length(consent_text) <= 2000)
);

COMMENT ON TABLE public.whatsapp_consent_events IS
  'Histórico append-only de concessões, revogações e pedidos de reconsentimento WhatsApp por finalidade, negócio e telefone.';
CREATE INDEX IF NOT EXISTS whatsapp_consent_events_lookup_idx
  ON public.whatsapp_consent_events (tenant_id, phone_e164, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_consent_events_customer_idx
  ON public.whatsapp_consent_events (tenant_id, customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  reason text NOT NULL,
  source text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  release_evidence jsonb,
  CONSTRAINT whatsapp_suppressions_phone_e164_chk
    CHECK (phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  CONSTRAINT whatsapp_suppressions_reason_chk
    CHECK (reason IN ('opt_out', 'wrong_number', 'staff_block')),
  CONSTRAINT whatsapp_suppressions_source_chk
    CHECK (length(trim(source)) BETWEEN 2 AND 80),
  CONSTRAINT whatsapp_suppressions_evidence_object_chk
    CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT whatsapp_suppressions_release_evidence_object_chk
    CHECK (release_evidence IS NULL OR jsonb_typeof(release_evidence) = 'object'),
  CONSTRAINT whatsapp_suppressions_release_consistency_chk
    CHECK ((released_at IS NULL AND released_by IS NULL AND release_evidence IS NULL)
      OR (released_at IS NOT NULL AND release_evidence IS NOT NULL))
);

COMMENT ON TABLE public.whatsapp_suppressions IS
  'Bloqueio independente do cadastro do cliente. Um SAIR continua valendo após exclusão ou recriação da ficha.';
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_suppressions_one_active_idx
  ON public.whatsapp_suppressions (tenant_id, phone_e164)
  WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS whatsapp_suppressions_lookup_idx
  ON public.whatsapp_suppressions (tenant_id, phone_e164, released_at);

-- Acesso deliberadamente exclusivo ao servidor com service_role.
-- As tabelas guardam prova de consentimento e telefone; não são editáveis pelo cliente via REST.
ALTER TABLE public.whatsapp_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_consent_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.whatsapp_suppressions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.whatsapp_consent_events TO service_role;
GRANT ALL ON TABLE public.whatsapp_suppressions TO service_role;
