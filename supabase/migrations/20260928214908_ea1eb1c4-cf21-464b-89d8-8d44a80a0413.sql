ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS retorno_dias integer;
ALTER TABLE public.servicos DROP CONSTRAINT IF EXISTS servicos_retorno_dias_faixa;
ALTER TABLE public.servicos ADD CONSTRAINT servicos_retorno_dias_faixa CHECK (retorno_dias IS NULL OR retorno_dias BETWEEN 3 AND 365);