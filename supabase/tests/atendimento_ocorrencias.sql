-- Aprendizado do atendimento (migração 0059). Termina sempre com erro proposital:
-- "OCORRENCIAS OK: N verificações" ou "OCORRENCIAS FALHOU (...)". Nada fica gravado.
DO $oc$
DECLARE
  t uuid := gen_random_uuid(); outro uuid := gen_random_uuid();
  u_dono uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid();
  falhas text[] := '{}'; total int := 0; ok boolean; n int;
BEGIN
  INSERT INTO auth.users (id, email, aud, role)
  SELECT u, u || '@ocorrencias.test', 'authenticated', 'authenticated' FROM unnest(ARRAY[u_dono, u_fora]) u;
  INSERT INTO public.tenants (id, nome, slug) VALUES
    (t, 'Ocorrências', 'ocorr-' || substr(t::text, 1, 8)),
    (outro, 'Outro', 'ocorr-' || substr(outro::text, 1, 8));
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  VALUES (t, u_dono, 'dono', public.permissoes_padrao('dono'), true);

  INSERT INTO public.atendimento_ocorrencias (tenant_id, mensagem_externa_id, motivo, origem, texto)
  VALUES (t, 'M1', 'nao_entendida', 'fluxo', 'quero um encaixizinho'),
         (outro, 'M2', 'erro', 'bot', 'falhou');

  -- Reentrega da mesma mensagem não duplica a ocorrência.
  BEGIN
    INSERT INTO public.atendimento_ocorrencias (tenant_id, mensagem_externa_id, motivo, origem)
    VALUES (t, 'M1', 'nao_entendida', 'fluxo');
    ok := true;
  EXCEPTION WHEN unique_violation THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou ocorrência repetida'::text; END IF;

  -- Motivo fora da lista é recusado.
  BEGIN
    INSERT INTO public.atendimento_ocorrencias (tenant_id, motivo, origem) VALUES (t, 'qualquer', 'fluxo');
    ok := true;
  EXCEPTION WHEN check_violation THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou motivo fora da lista'::text; END IF;

  -- A equipe do negócio lê só as suas; quem é de fora não lê nada; ninguém grava pela API.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_dono, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.atendimento_ocorrencias;
  total := total + 1; IF n <> 1 THEN falhas := falhas || format('dono leu %s ocorrências (esperado 1)', n); END IF;
  BEGIN
    INSERT INTO public.atendimento_ocorrencias (tenant_id, motivo, origem) VALUES (t, 'erro', 'bot');
    ok := true;
  EXCEPTION WHEN insufficient_privilege THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'equipe gravou pela API'::text; END IF;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_fora, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.atendimento_ocorrencias;
  total := total + 1; IF n <> 0 THEN falhas := falhas || format('pessoa de fora leu %s', n); END IF;
  RESET ROLE;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'OCORRENCIAS OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'OCORRENCIAS FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$oc$;
