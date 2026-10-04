ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS evento text,
  ADD COLUMN IF NOT EXISTS destinatario_tipo text NOT NULL DEFAULT 'gestor',
  ADD COLUMN IF NOT EXISTS cliente_id uuid,
  ADD COLUMN IF NOT EXISTS agendamento_id uuid,
  ADD COLUMN IF NOT EXISTS prioridade text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS chave_dedupe text,
  ADD COLUMN IF NOT EXISTS agrupar_em text,
  ADD COLUMN IF NOT EXISTS canais jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS obsoleta_em timestamptz,
  ADD COLUMN IF NOT EXISTS respondida_em timestamptz,
  ADD COLUMN IF NOT EXISTS resposta text;

ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_destinatario_tipo_chk CHECK (destinatario_tipo IN ('cliente','profissional','gestor')),
  ADD CONSTRAINT notificacoes_prioridade_chk CHECK (prioridade IN ('critica','importante','normal','relacionamento'));

CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_tenant_chave_dedupe_uidx
  ON public.notificacoes (tenant_id, chave_dedupe) WHERE chave_dedupe IS NOT NULL;
CREATE INDEX IF NOT EXISTS notificacoes_agendamento_idx
  ON public.notificacoes (agendamento_id) WHERE agendamento_id IS NOT NULL;

COMMENT ON COLUMN public.notificacoes.destinatario_tipo IS 'cliente | profissional | gestor. Linhas de cliente são trilha/dedupe e não aparecem no sininho da equipe.';
COMMENT ON COLUMN public.notificacoes.canais IS 'Decisão de canais do emissor único (in_app, push, whatsapp) com motivo.';