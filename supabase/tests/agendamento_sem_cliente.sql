-- Agendamento sem cliente (migrações 0039–0041). O dono agenda; o bloco termina sempre com erro
-- proposital: "SEM CLIENTE OK: N verificações" ou "SEM CLIENTE FALHOU (...)". Nada fica gravado.
DO $sc$
DECLARE
  t uuid := gen_random_uuid(); u_dono uuid := gen_random_uuid();
  prof uuid := gen_random_uuid(); sv uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  ag uuid; r jsonb; msg text; n int;
  falhas text[] := '{}'; total int := 0;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES (u_dono, u_dono || '@semcliente.test', 'authenticated', 'authenticated');
  INSERT INTO public.tenants (id, nome, slug) VALUES (t, 'Sem Cliente Teste', 'semcliente-' || substr(t::text, 1, 8));
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  VALUES (t, u_dono, 'dono', public.permissoes_padrao('dono'), true);
  INSERT INTO public.profissionais (id, tenant_id, nome) VALUES (prof, t, 'Profissional');
  INSERT INTO public.servicos (id, tenant_id, nome, preco_centavos, duracao_min) VALUES (sv, t, 'Corte', 5000, 30);
  -- O dono chama as funções (auth.uid() é o dono); o resto do bloco roda como dono do banco.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_dono, 'role', 'authenticated')::text, true);

  -- Sem cliente, no balcão: cria o agendamento e não abre comanda.
  r := public.criar_agendamento(t, NULL, prof, sv, now() + interval '2 days', 'balcao', false, false);
  ag := (r ->> 'agendamento_id')::uuid;
  total := total + 2;
  IF ag IS NULL OR (SELECT cliente_id FROM public.agendamentos WHERE id = ag) IS NOT NULL THEN
    falhas := falhas || 'não criou agendamento sem cliente'::text;
  END IF;
  SELECT count(*) INTO n FROM public.comandas WHERE agendamento_id = ag;
  IF n <> 0 THEN falhas := falhas || format('abriu %s comanda sem cliente', n); END IF;

  -- Formas que dependem da carteira continuam exigindo cliente.
  total := total + 1;
  BEGIN PERFORM public.criar_agendamento(t, NULL, prof, sv, now() + interval '3 days', 'pix', false, false); msg := 'aceitou';
  EXCEPTION WHEN others THEN msg := SQLERRM; END;
  IF msg <> 'cliente obrigatorio para esta forma de pagamento' THEN falhas := falhas || format('pix sem cliente respondeu "%s"', msg); END IF;

  -- Ao vincular o cliente, a comanda nasce com o serviço do catálogo.
  INSERT INTO public.clientes (id, tenant_id, nome, telefone) VALUES (cli, t, 'Cliente', '5511900000009');
  UPDATE public.agendamentos SET cliente_id = cli WHERE id = ag;
  total := total + 2;
  SELECT count(*) INTO n FROM public.comandas WHERE agendamento_id = ag AND cliente_id = cli;
  IF n <> 1 THEN falhas := falhas || format('vincular cliente abriu %s comandas', n); END IF;
  SELECT count(*) INTO n FROM public.comanda_itens i JOIN public.comandas c ON c.id = i.comanda_id
  WHERE c.agendamento_id = ag AND i.servico_id = sv AND i.valor_total_centavos = 5000;
  IF n <> 1 THEN falhas := falhas || 'comanda sem o serviço do catálogo'::text; END IF;

  -- Com cliente desde o início, tudo segue como antes.
  r := public.criar_agendamento(t, cli, prof, sv, now() + interval '4 days', 'balcao', false, false);
  total := total + 1;
  SELECT count(*) INTO n FROM public.comandas WHERE agendamento_id = (r ->> 'agendamento_id')::uuid;
  IF n <> 1 THEN falhas := falhas || 'agendamento com cliente sem comanda'::text; END IF;

  -- A função do gatilho não fica exposta pela API.
  total := total + 1;
  IF has_function_privilege('authenticated', 'public.agendamento_criar_comanda_ao_vincular_cliente()', 'EXECUTE') THEN
    falhas := falhas || 'função do gatilho executável pela API'::text;
  END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'SEM CLIENTE OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'SEM CLIENTE FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$sc$;
