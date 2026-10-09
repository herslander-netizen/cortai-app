-- Escrita da equipe só com a permissão do papel (migração 0027).
-- Mesmo formato de supabase/tests/rbac.sql: tudo roda num bloco que SEMPRE termina
-- com erro proposital, então nada fica gravado. A mensagem final traz o placar:
--   "ESCRITA OK: N verificações"  -> todas passaram
--   "ESCRITA FALHOU: ..."         -> lista do que vazou ou quebrou
DO $escrita$
DECLARE
  t uuid := gen_random_uuid();
  u_dono uuid := gen_random_uuid(); u_ger uuid := gen_random_uuid();
  u_barb uuid := gen_random_uuid(); u_rec uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid();
  prof uuid := gen_random_uuid(); cli uuid := gen_random_uuid(); sv uuid := gen_random_uuid();
  prod uuid := gen_random_uuid(); ag uuid := gen_random_uuid(); ag_fim uuid := gen_random_uuid();
  cart uuid;
  falhas text[] := '{}'; total int := 0; ok boolean; n int;
  r record;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES
    (u_dono, u_dono||'@escrita.test','authenticated','authenticated'), (u_ger, u_ger||'@escrita.test','authenticated','authenticated'),
    (u_barb, u_barb||'@escrita.test','authenticated','authenticated'), (u_rec, u_rec||'@escrita.test','authenticated','authenticated'),
    (u_fora, u_fora||'@escrita.test','authenticated','authenticated');
  INSERT INTO public.tenants (id, nome, slug) VALUES (t, 'Escrita Teste', 'escrita-' || substr(t::text,1,8));
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  SELECT t, u, p, public.permissoes_padrao(p), true
  FROM (VALUES (u_dono,'dono'),(u_ger,'gerente'),(u_barb,'barbeiro'),(u_rec,'recepcao')) v(u,p);
  INSERT INTO public.profissionais (id, tenant_id, nome, user_id) VALUES (prof, t, 'Profissional', u_barb);
  INSERT INTO public.clientes (id, tenant_id, nome, telefone) VALUES (cli, t, 'Cliente', '5511900000002');
  INSERT INTO public.carteiras (tenant_id, cliente_id) VALUES (t, cli) ON CONFLICT DO NOTHING;
  SELECT id INTO cart FROM public.carteiras WHERE tenant_id = t AND cliente_id = cli;
  INSERT INTO public.servicos (id, tenant_id, nome, preco_centavos) VALUES (sv, t, 'Corte', 5000);
  INSERT INTO public.produtos (id, tenant_id, nome, preco_centavos, quantidade, ativo) VALUES (prod, t, 'Pomada', 3000, 100, true);
  INSERT INTO public.agendamentos (id, tenant_id, cliente_id, profissional_id, servico_id, inicio, fim)
  VALUES (ag, t, cli, prof, sv, now() + interval '3 days', now() + interval '3 days 30 minutes'),
         (ag_fim, t, cli, prof, sv, now() + interval '4 days', now() + interval '4 days 30 minutes');
  INSERT INTO public.avaliacoes (tenant_id, agendamento_id, nota) VALUES (t, ag_fim, 2);

  CREATE TEMP TABLE IF NOT EXISTS escrita_casos (papel text, uid uuid, membro bool, catalogo bool, estoque bool, venda bool) ON COMMIT DROP;
  -- membro: lê e altera colunas comuns do agendamento; catalogo: serviços, profissionais e horários;
  -- estoque: cadastro/preço de produtos; venda: registrar venda pela função oficial.
  INSERT INTO escrita_casos VALUES
    ('dono',     u_dono, true,  true,  true,  true),
    ('gerente',  u_ger,  true,  true,  true,  true),
    ('recepcao', u_rec,  true,  false, false, true),
    ('barbeiro', u_barb, true,  false, false, true),
    ('estranho', u_fora, false, false, false, false);
  GRANT SELECT ON escrita_casos TO authenticated;

  FOR r IN SELECT * FROM escrita_casos LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', r.uid, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    -- movimentos: ninguém lança direto (nem o dono); só servidor/RPC.
    BEGIN INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, criado_por)
          VALUES (cart, 'credito', 10, 'ajuste', r.uid); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s lançou movimento direto', r.papel); END IF;

    -- agendamentos: pagamento, situação e valor nunca por UPDATE direto.
    BEGIN UPDATE public.agendamentos SET pagamento_confirmado_em = now(), pagamento_confirmado_por = r.uid WHERE id = ag; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s confirmou pagamento direto', r.papel); END IF;
    BEGIN UPDATE public.agendamentos SET status = 'cancelado' WHERE id = ag; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s cancelou por UPDATE direto', r.papel); END IF;
    BEGIN UPDATE public.agendamentos SET valor_centavos = 1 WHERE id = ag; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s mudou valor direto', r.papel); END IF;
    -- coluna comum continua livre para a equipe (nada quebrou).
    BEGIN UPDATE public.agendamentos SET confirmado_em = now() WHERE id = ag; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.membro THEN falhas := falhas || format('%s atualizar coluna comum (esperado %s)', r.papel, r.membro); END IF;

    -- leitura da equipe segue igual.
    SELECT count(*) INTO n FROM public.servicos WHERE id = sv;
    total := total + 1; IF (n = 1) <> r.membro THEN falhas := falhas || format('%s lê %s do serviço de teste', r.papel, n); END IF;

    -- catálogo
    BEGIN UPDATE public.servicos SET preco_centavos = preco_centavos + 1 WHERE id = sv; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.catalogo THEN falhas := falhas || format('%s mudar preço do serviço (esperado %s)', r.papel, r.catalogo); END IF;
    BEGIN INSERT INTO public.servicos (tenant_id, nome) VALUES (t, 'Novo ' || r.papel); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.catalogo THEN falhas := falhas || format('%s criar serviço (esperado %s)', r.papel, r.catalogo); END IF;
    BEGIN UPDATE public.profissionais SET descricao = 'x' WHERE id = prof; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.catalogo THEN falhas := falhas || format('%s alterar profissional (esperado %s)', r.papel, r.catalogo); END IF;
    BEGIN INSERT INTO public.horarios_de_funcionamento (tenant_id, dia_semana, fechado, abre, fecha)
          VALUES (t, (SELECT coalesce(max(dia_semana), -1) + 1 FROM public.horarios_de_funcionamento WHERE tenant_id = t), false, '09:00', '18:00');
          ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.catalogo THEN falhas := falhas || format('%s criar horário (esperado %s)', r.papel, r.catalogo); END IF;

    -- produtos
    BEGIN UPDATE public.produtos SET preco_centavos = preco_centavos + 1 WHERE id = prod; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.estoque THEN falhas := falhas || format('%s mudar preço do produto (esperado %s)', r.papel, r.estoque); END IF;
    BEGIN PERFORM public.registrar_venda_produto(prod, 1, 'balcao'); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.venda THEN falhas := falhas || format('%s registrar venda (esperado %s)', r.papel, r.venda); END IF;

    -- avaliações: equipe só lê.
    BEGIN DELETE FROM public.avaliacoes WHERE tenant_id = t; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s apagou avaliação', r.papel); END IF;
    BEGIN UPDATE public.avaliacoes SET nota = 5 WHERE tenant_id = t; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s alterou avaliação', r.papel); END IF;
    SELECT count(*) INTO n FROM public.avaliacoes WHERE tenant_id = t;
    total := total + 1; IF (n = 1) <> r.membro THEN falhas := falhas || format('%s lê %s avaliações', r.papel, n); END IF;

    EXECUTE 'RESET ROLE';
  END LOOP;

  -- As funções oficiais (SECURITY DEFINER) continuam podendo mudar a situação.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_rec, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN PERFORM public.cancelar_agendamento(ag); ok := true;
  EXCEPTION WHEN others THEN ok := false; END;
  EXECUTE 'RESET ROLE';
  total := total + 1; IF NOT ok THEN falhas := falhas || 'recepção não cancelou pela RPC oficial'::text; END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'ESCRITA OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'ESCRITA FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$escrita$;
