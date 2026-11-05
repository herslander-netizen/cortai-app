-- Linha da plataforma (migração 0056). Termina sempre com erro proposital:
-- "LINHA DA PLATAFORMA OK: N verificações" ou "LINHA DA PLATAFORMA FALHOU (...)". Nada fica gravado.
DO $lp$
DECLARE
  u_admin uuid := gen_random_uuid(); u_dono uuid := gen_random_uuid();
  falhas text[] := '{}'; total int := 0; ok boolean; n int;
BEGIN
  INSERT INTO auth.users (id, email, aud, role)
  SELECT u, u || '@plataforma.test', 'authenticated', 'authenticated' FROM unnest(ARRAY[u_admin, u_dono]) u;
  INSERT INTO public.user_roles (user_id, role) VALUES (u_admin, 'admin');

  -- Opt-in começa desligado.
  INSERT INTO public.telefones_da_equipe (user_id, telefone, verificado_em) VALUES (u_dono, '5579900000001', now());
  SELECT count(*) INTO n FROM public.telefones_da_equipe WHERE user_id = u_dono AND avisos_da_plataforma = false;
  total := total + 1; IF n <> 1 THEN falhas := falhas || 'opt-in não começa desligado'::text; END IF;

  -- Mesmo aviso não sai duas vezes (chave única).
  INSERT INTO public.envios_da_plataforma (chave, evento, user_id) VALUES ('queda:x:2026110512', 'whatsapp_do_negocio_caiu', u_dono);
  BEGIN
    INSERT INTO public.envios_da_plataforma (chave, evento, user_id) VALUES ('queda:x:2026110512', 'whatsapp_do_negocio_caiu', u_dono);
    ok := true;
  EXCEPTION WHEN unique_violation THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou aviso repetido'::text; END IF;

  -- Só eventos da lista fechada (nunca aviso de negócio para cliente).
  BEGIN
    INSERT INTO public.envios_da_plataforma (chave, evento) VALUES ('x', 'lembrete_24h');
    ok := true;
  EXCEPTION WHEN check_violation THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou evento fora da lista'::text; END IF;

  -- Leitura: admin vê, dono não vê; ninguém autenticado grava.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.envios_da_plataforma;
  total := total + 1; IF n <> 1 THEN falhas := falhas || 'admin não lê os envios'::text; END IF;
  BEGIN
    INSERT INTO public.envios_da_plataforma (chave, evento) VALUES ('y', 'alerta_admin');
    ok := true;
  EXCEPTION WHEN insufficient_privilege THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'admin autenticado gravou direto'::text; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_dono, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.envios_da_plataforma;
  total := total + 1; IF n <> 0 THEN falhas := falhas || 'dono leu os envios da plataforma'::text; END IF;
  EXECUTE 'RESET ROLE';

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'LINHA DA PLATAFORMA OK: % verificações', total;
  END IF;
  RAISE EXCEPTION 'LINHA DA PLATAFORMA FALHOU (%)', array_to_string(falhas, '; ');
END $lp$;
