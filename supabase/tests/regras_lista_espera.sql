-- Regras da lista de espera (migração 0060). Termina sempre com erro proposital:
-- "REGRAS ESPERA OK: N verificações" ou "REGRAS ESPERA FALHOU (...)". Nada fica gravado.
DO $re$
DECLARE
  t uuid := gen_random_uuid();
  u_dono uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid();
  falhas text[] := '{}'; total int := 0; ok boolean; v record;
BEGIN
  INSERT INTO auth.users (id, email, aud, role)
  SELECT u, u || '@regras.test', 'authenticated', 'authenticated' FROM unnest(ARRAY[u_dono, u_fora]) u;
  INSERT INTO public.tenants (id, nome, slug) VALUES (t, 'Regras', 'regras-' || substr(t::text, 1, 8));
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  VALUES (t, u_dono, 'dono', public.permissoes_padrao('dono'), true);

  -- Padrões iguais ao comportamento de antes.
  SELECT espera_prazo_min, espera_antecedencia_min, espera_qualquer_profissional INTO v
    FROM public.tenants WHERE id = t;
  total := total + 1;
  IF v.espera_prazo_min <> 30 OR v.espera_antecedencia_min <> 10 OR v.espera_qualquer_profissional THEN
    falhas := falhas || 'padrões diferentes de 30/10/false'::text;
  END IF;

  -- Valor fora da lista é recusado.
  BEGIN
    UPDATE public.tenants SET espera_prazo_min = 45 WHERE id = t;
    ok := true;
  EXCEPTION WHEN check_violation THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou prazo fora da lista'::text; END IF;

  -- O dono grava pela função.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_dono, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.definir_regras_lista_espera(t, 15::smallint, 60::smallint, true);
  RESET ROLE;
  SELECT espera_prazo_min, espera_antecedencia_min, espera_qualquer_profissional INTO v
    FROM public.tenants WHERE id = t;
  total := total + 1;
  IF v.espera_prazo_min <> 15 OR v.espera_antecedencia_min <> 60 OR NOT v.espera_qualquer_profissional THEN
    falhas := falhas || 'dono não conseguiu gravar as regras'::text;
  END IF;

  -- Quem é de fora não grava.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_fora, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.definir_regras_lista_espera(t, 60::smallint, 10::smallint, false);
    ok := true;
  EXCEPTION WHEN raise_exception THEN ok := false; END;
  RESET ROLE;
  total := total + 1; IF ok THEN falhas := falhas || 'pessoa de fora alterou as regras'::text; END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'REGRAS ESPERA OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'REGRAS ESPERA FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$re$;
