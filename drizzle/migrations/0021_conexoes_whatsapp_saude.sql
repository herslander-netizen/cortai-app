ALTER TABLE public.conexoes_whatsapp
  ADD COLUMN IF NOT EXISTS ultimo_evento_em timestamptz,
  ADD COLUMN IF NOT EXISTS verificado_em timestamptz,
  ADD COLUMN IF NOT EXISTS reconexao_tentada_em timestamptz,
  ADD COLUMN IF NOT EXISTS reconexao_tentativas integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.conexoes_whatsapp.ultimo_evento_em IS 'Horário do último CONNECTION_UPDATE aplicado; evento mais antigo é ignorado.';
COMMENT ON COLUMN public.conexoes_whatsapp.verificado_em IS 'Última consulta do monitor ao estado real da sessão.';
COMMENT ON COLUMN public.conexoes_whatsapp.reconexao_tentativas IS 'Tentativas automáticas seguidas sem sucesso; zera ao reconectar.';