ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS fidelidade_participa boolean,
  ADD COLUMN IF NOT EXISTS desconto_percentual smallint,
  ADD COLUMN IF NOT EXISTS condicoes_especiais text,
  ADD COLUMN IF NOT EXISTS observacoes_internas text;

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_desconto_percentual_faixa
  CHECK (desconto_percentual IS NULL OR (desconto_percentual >= 0 AND desconto_percentual <= 100));