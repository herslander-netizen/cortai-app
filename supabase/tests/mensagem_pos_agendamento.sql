-- Mensagem depois de agendar (migração 0061). Termina sempre com erro proposital:
-- "MENSAGEM POS OK: N verificações" ou "MENSAGEM POS FALHOU (...)". Nada fica gravado.
DO $mp$
DECLARE
  t uuid := gen_random_uuid();
  falhas text[] := '{}'; total int := 0; ok boolean; v text;
BEGIN
  INSERT INTO public.tenants (id, nome, slug) VALUES (t, 'Mensagem', 'mensagem-' || substr(t::text, 1, 8));

  total := total + 1;
  SELECT mensagem_pos_agendamento INTO v FROM public.tenants WHERE id = t;
  IF v IS NOT NULL THEN falhas := falhas || 'padrão deveria ser nulo'::text; END IF;

  total := total + 1;
  UPDATE public.tenants SET mensagem_pos_agendamento = 'Chegue 10 minutos antes.' WHERE id = t;
  SELECT mensagem_pos_agendamento INTO v FROM public.tenants WHERE id = t;
  IF v IS DISTINCT FROM 'Chegue 10 minutos antes.' THEN falhas := falhas || 'não gravou o texto'::text; END IF;

  BEGIN
    UPDATE public.tenants SET mensagem_pos_agendamento = repeat('x', 301) WHERE id = t;
    ok := true;
  EXCEPTION WHEN check_violation THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou mais de 300 caracteres'::text; END IF;

  IF cardinality(falhas) > 0 THEN
    RAISE EXCEPTION 'MENSAGEM POS FALHOU (%)', array_to_string(falhas, '; ');
  END IF;
  RAISE EXCEPTION 'MENSAGEM POS OK: % verificações', total;
END
$mp$;
