ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS dimensoes jsonb,
  ADD COLUMN IF NOT EXISTS sinal_atencao boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validar_dimensoes_avaliacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chave text;
  valor jsonb;
BEGIN
  IF NEW.dimensoes IS NULL THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(NEW.dimensoes) <> 'object' THEN
    RAISE EXCEPTION 'Dimensões da avaliação devem ser um objeto';
  END IF;

  FOR chave, valor IN SELECT * FROM jsonb_each(NEW.dimensoes)
  LOOP
    IF chave NOT IN ('atendimento', 'pontualidade', 'agendamento', 'experiencia')
       OR jsonb_typeof(valor) <> 'number'
       OR (valor #>> '{}')::numeric NOT BETWEEN 1 AND 5 THEN
      RAISE EXCEPTION 'Dimensão de avaliação inválida';
    END IF;
  END LOOP;

  NEW.sinal_atencao := NEW.nota <= 2 OR EXISTS (
    SELECT 1
    FROM jsonb_each(NEW.dimensoes) AS item
    WHERE (item.value #>> '{}')::numeric <= 2
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_dimensoes_avaliacao_trigger ON public.avaliacoes;
CREATE TRIGGER validar_dimensoes_avaliacao_trigger
BEFORE INSERT OR UPDATE OF nota, dimensoes ON public.avaliacoes
FOR EACH ROW EXECUTE FUNCTION public.validar_dimensoes_avaliacao();

UPDATE public.avaliacoes
SET sinal_atencao = (nota <= 2)
WHERE sinal_atencao IS DISTINCT FROM (nota <= 2);

CREATE INDEX IF NOT EXISTS avaliacoes_tenant_atencao_idx
ON public.avaliacoes (tenant_id, sinal_atencao, criado_em DESC);