-- Horário especial numa data (migração 0054). O dono agenda conferindo as regras; o bloco termina sempre com erro
-- proposital: "HORARIO ESPECIAL OK: N verificações" ou "HORARIO ESPECIAL FALHOU (...)". Nada fica gravado.
DO $he$
DECLARE
  t uuid := gen_random_uuid(); u_dono uuid := gen_random_uuid();
  p1 uuid := gen_random_uuid(); p2 uuid := gen_random_uuid(); sv uuid := gen_random_uuid();
  fuso text := 'America/Sao_Paulo';
  d date := (now() AT TIME ZONE 'America/Sao_Paulo')::date + 3;
  msg text; falhas text[] := '{}'; total int := 0;
  -- Tenta agendar 30 min em `dia` às `hora` e devolve "ok" ou a mensagem do erro.
  caso record;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES (u_dono, u_dono || '@especial.test', 'authenticated', 'authenticated');
  INSERT INTO public.tenants (id, nome, slug, fuso) VALUES (t, 'Especial Teste', 'especial-' || substr(t::text, 1, 8), fuso);
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  VALUES (t, u_dono, 'dono', public.permissoes_padrao('dono'), true);
  INSERT INTO public.profissionais (id, tenant_id, nome) VALUES (p1, t, 'Um'), (p2, t, 'Dois');
  INSERT INTO public.servicos (id, tenant_id, nome, preco_centavos, duracao_min) VALUES (sv, t, 'Serviço', 5000, 30);
  INSERT INTO public.horarios_de_funcionamento (tenant_id, dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim)
  SELECT t, g, false, '09:00', '18:00', '12:00', '13:00' FROM generate_series(0, 6) g;
  -- Negócio todo das 7h às 21h no dia; o profissional Dois só das 10h às 11h.
  INSERT INTO public.horarios_especiais (tenant_id, profissional_id, dia, abre, fecha)
  VALUES (t, NULL, d, '07:00', '21:00'), (t, p2, d, '10:00', '11:00');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_dono, 'role', 'authenticated')::text, true);

  FOR caso IN SELECT * FROM (VALUES
      (p1, 0, '07:30'::time, 'ok', 'abre antes pelo especial do negócio'),
      (p1, 0, '06:30'::time, 'fora do horario de funcionamento', 'antes do especial'),
      (p1, 0, '12:15'::time, 'fora do horario de funcionamento', 'intervalo da semana continua'),
      (p1, 0, '20:30'::time, 'ok', 'fecha depois pelo especial'),
      (p1, 0, '20:45'::time, 'fora do horario de funcionamento', 'passa do fim do especial'),
      (p2, 0, '07:30'::time, 'fora do horario de funcionamento', 'especial próprio vence o do negócio'),
      (p2, 0, '10:00'::time, 'ok', 'dentro do especial próprio'),
      (p1, 1, '07:30'::time, 'fora do horario de funcionamento', 'dia seguinte segue a semana'),
      (p1, 1, '09:30'::time, 'ok', 'dia seguinte no horário da semana')
    ) AS c(prof, desloc, hora, esperado, nome)
  LOOP
    total := total + 1;
    BEGIN
      PERFORM public.criar_agendamento(t, NULL, caso.prof, sv, ((d + caso.desloc) + caso.hora) AT TIME ZONE fuso, 'balcao', false, true);
      msg := 'ok';
    EXCEPTION WHEN others THEN msg := SQLERRM; END;
    IF msg <> caso.esperado THEN falhas := falhas || format('%s: "%s"', caso.nome, msg); END IF;
  END LOOP;

  -- Um horário por data para o negócio.
  total := total + 1;
  BEGIN
    INSERT INTO public.horarios_especiais (tenant_id, profissional_id, dia, abre, fecha) VALUES (t, NULL, d, '08:00', '20:00');
    msg := 'aceitou';
  EXCEPTION WHEN unique_violation THEN msg := 'recusou'; END;
  IF msg <> 'recusou' THEN falhas := falhas || 'aceitou dois horários especiais do negócio na mesma data'::text; END IF;

  -- Fim antes do início é recusado.
  total := total + 1;
  BEGIN
    INSERT INTO public.horarios_especiais (tenant_id, profissional_id, dia, abre, fecha) VALUES (t, p1, d + 2, '18:00', '09:00');
    msg := 'aceitou';
  EXCEPTION WHEN check_violation THEN msg := 'recusou'; END;
  IF msg <> 'recusou' THEN falhas := falhas || 'aceitou fim antes do início'::text; END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'HORARIO ESPECIAL OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'HORARIO ESPECIAL FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$he$;
