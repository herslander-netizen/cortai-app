
CREATE OR REPLACE FUNCTION public.recalcular_carteira()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.carteiras c
  SET saldo_creditos = agg.creditos,
      saldo_centavos = agg.centavos,
      fidelidade_progresso = agg.fidelidade,
      atualizado_em = now()
  FROM (
    SELECT
      COALESCE(SUM(CASE WHEN m.tipo <> 'fidelidade' THEN m.creditos_delta ELSE 0 END), 0)::int AS creditos,
      COALESCE(SUM(m.centavos_delta), 0)::int AS centavos,
      COALESCE(SUM(CASE WHEN m.tipo = 'fidelidade' THEN m.creditos_delta ELSE 0 END), 0)::int AS fidelidade
    FROM public.movimentos m
    WHERE m.carteira_id = NEW.carteira_id
  ) agg
  WHERE c.id = NEW.carteira_id;
  RETURN NULL;
END;
$function$;

-- reprocessa saldos existentes (desliga o guarda de saldo durante o recalculo)
ALTER TABLE public.carteiras DISABLE TRIGGER trg_carteiras_saldo_protegido;
UPDATE public.carteiras c
SET saldo_creditos = agg.creditos,
    saldo_centavos = agg.centavos,
    fidelidade_progresso = agg.fidelidade,
    atualizado_em = now()
FROM (
  SELECT m.carteira_id,
    COALESCE(SUM(CASE WHEN m.tipo <> 'fidelidade' THEN m.creditos_delta ELSE 0 END), 0)::int AS creditos,
    COALESCE(SUM(m.centavos_delta), 0)::int AS centavos,
    COALESCE(SUM(CASE WHEN m.tipo = 'fidelidade' THEN m.creditos_delta ELSE 0 END), 0)::int AS fidelidade
  FROM public.movimentos m GROUP BY m.carteira_id
) agg
WHERE c.id = agg.carteira_id;
ALTER TABLE public.carteiras ENABLE TRIGGER trg_carteiras_saldo_protegido;
