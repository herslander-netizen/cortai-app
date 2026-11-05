-- Limite mensal do plano grátis (migração 0057). O bloco termina sempre com erro proposital:
-- "LIMITE PLANO OK: N verificações" ou "LIMITE PLANO FALHOU (...)". Nada fica gravado.
DO $lp$
DECLARE
  t uuid := gen_random_uuid(); u_dono uuid := gen_random_uuid();
  sv uuid := gen_random_uuid(); prof uuid; ag uuid; msg text; n int;
  falhas text[] := '{}'; total int := 0;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES (u_dono, u_dono || '@limite.test', 'authenticated', 'authenticated');
  INSERT INTO public.tenants (id, nome, slug, plano) VALUES (t, 'Limite Teste', 'limite-' || substr(t::text, 1, 8), 'essencial');
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  VALUES (t, u_dono, 'dono', public.permissoes_padrao('dono'), true);
  INSERT INTO public.servicos (id, tenant_id, nome, preco_centavos, duracao_min) VALUES (sv, t, 'Corte', 5000, 30);
  INSERT INTO public.planos_da_plataforma (chave, nome, preco_mensal_centavos, preco_anual_centavos, ordem, ativo, limite_agendamentos_mes)
  VALUES ('essencial', 'Essencial', 0, 0, 1, true, 50)
  ON CONFLICT (chave) DO UPDATE SET limite_agendamentos_mes = 50;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_dono, 'role', 'authenticated')::text, true);

  -- 50 agendamentos no mês (um profissional por agendamento, para não colidir na agenda).
  FOR n IN 1..50 LOOP
    prof := gen_random_uuid();
    INSERT INTO public.profissionais (id, tenant_id, nome) VALUES (prof, t, 'P' || n);
    INSERT INTO public.agendamentos (tenant_id, profissional_id, servico_id, inicio, fim, status, forma_pagamento, valor_centavos)
    VALUES (t, prof, sv, now() + make_interval(mins => n), now() + make_interval(mins => n + 30), 'agendado', 'balcao', 5000);
  END LOOP;

  -- Chegou em 50: o 51º é bloqueado com a mensagem do plano.
  prof := gen_random_uuid();
  INSERT INTO public.profissionais (id, tenant_id, nome) VALUES (prof, t, 'Extra');
  total := total + 1;
  BEGIN PERFORM public.criar_agendamento(t, NULL, prof, sv, now() + interval '5 days', 'balcao', false, false); msg := 'aceitou';
  EXCEPTION WHEN others THEN msg := SQLERRM; END;
  IF msg NOT LIKE '%limite do seu plano%' THEN
    falhas := falhas || format('51º agendamento não bloqueado: "%s"', msg);
  END IF;

  -- Cancelado não conta: libera uma vaga.
  UPDATE public.agendamentos SET status = 'cancelado'
  WHERE id = (SELECT id FROM public.agendamentos WHERE tenant_id = t AND status = 'agendado' LIMIT 1);
  prof := gen_random_uuid();
  INSERT INTO public.profissionais (id, tenant_id, nome) VALUES (prof, t, 'Depois do cancelamento');
  total := total + 1;
  BEGIN ag := (public.criar_agendamento(t, NULL, prof, sv, now() + interval '8 days', 'balcao', false, false) ->> 'agendamento_id')::uuid;
  EXCEPTION WHEN others THEN ag := NULL; msg := SQLERRM; END;
  IF ag IS NULL THEN falhas := falhas || format('não liberou vaga após cancelar: "%s"', msg); END IF;

  -- Em teste (45 dias) o plano não limita.
  UPDATE public.tenants SET assinatura_status = 'teste', teste_fim = now() + interval '1 day' WHERE id = t;
  prof := gen_random_uuid();
  INSERT INTO public.profissionais (id, tenant_id, nome) VALUES (prof, t, 'Teste');
  total := total + 1;
  BEGIN PERFORM public.criar_agendamento(t, NULL, prof, sv, now() + interval '6 days', 'balcao', false, false); msg := 'aceitou';
  EXCEPTION WHEN others THEN msg := SQLERRM; END;
  IF msg <> 'aceitou' THEN falhas := falhas || format('teste bloqueado: "%s"', msg); END IF;

  -- Plano sem limite (Studio) não bloqueia.
  UPDATE public.tenants SET assinatura_status = 'ativa', teste_fim = NULL, plano = 'studio' WHERE id = t;
  total := total + 1;
  BEGIN PERFORM public.criar_agendamento(t, NULL, prof, sv, now() + interval '7 days', 'balcao', false, false); msg := 'aceitou';
  EXCEPTION WHEN others THEN msg := SQLERRM; END;
  IF msg <> 'aceitou' THEN falhas := falhas || format('studio bloqueado: "%s"', msg); END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'LIMITE PLANO OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'LIMITE PLANO FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$lp$;
