ALTER TABLE public.config_atendimento_ia
  ADD COLUMN IF NOT EXISTS ia_pausada_em timestamptz,
  ADD COLUMN IF NOT EXISTS ia_pausa_motivo text,
  ADD COLUMN IF NOT EXISTS ia_limite_diario_whatsapp integer NOT NULL DEFAULT 400;
COMMENT ON COLUMN public.config_atendimento_ia.ia_pausada_em IS 'Cérebro CortAI: IA pausada por falta de créditos/limite; canais automáticos voltam às regras fixas até o dono reativar.';
CREATE INDEX IF NOT EXISTS acoes_de_ia_log_tenant_acao_criado_idx ON public.acoes_de_ia_log (tenant_id, acao, criado_em DESC);