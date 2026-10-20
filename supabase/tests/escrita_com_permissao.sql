-- Resíduo do achado 6 (migração 0038): escrita direta nas sete tabelas que só exigiam
-- is_tenant_member passa a exigir a permissão do papel. Termina sempre com erro proposital:
-- "RESIDUO OK: N verificações" ou "RESIDUO FALHOU (...)". Nada fica gravado.
DO $res$
DECLARE
  t uuid := gen_random_uuid();
  u_dono uuid := gen_random_uuid(); u_ger uuid := gen_random_uuid(); u_rec uuid := gen_random_uuid();
  u_barb uuid := gen_random_uuid(); u_restr uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid();
  prof uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  falhas text[] := '{}'; total int := 0; ok boolean; n int; dia int := 0;
  r record;
BEGIN
  INSERT INTO auth.users (id, email, aud, role)
  SELECT u, u || '@residuo.test', 'authenticated', 'authenticated'
  FROM unnest(ARRAY[u_dono, u_ger, u_rec, u_barb, u_restr, u_fora]) u;
  INSERT INTO public.tenants (id, nome, slug) VALUES (t, 'Resíduo Teste', 'residuo-' || substr(t::text, 1, 8));
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  SELECT t, u, p, public.permissoes_padrao(p), true
  FROM (VALUES (u_dono, 'dono'), (u_ger, 'gerente'), (u_rec, 'recepcao'), (u_barb, 'barbeiro')) v(u, p);
  -- Profissional ativo de quem o dono tirou todas as permissões.
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  VALUES (t, u_restr, 'barbeiro', '{}'::text[], true);
  INSERT INTO public.profissionais (id, tenant_id, nome, user_id) VALUES (prof, t, 'Profissional', u_barb);
  INSERT INTO public.clientes (id, tenant_id, nome, telefone) VALUES (cli, t, 'Cliente', '5511900000003');
  INSERT INTO public.onboarding_do_tenant (tenant_id) VALUES (t) ON CONFLICT DO NOTHING;

  -- membro: lê; cliente: cria/edita cliente, bloqueia e põe na fila; catalogo: escala, indicação e
  -- onboarding; destrutivo: exclui cliente.
  CREATE TEMP TABLE IF NOT EXISTS residuo_casos
    (papel text, uid uuid, membro bool, cliente bool, catalogo bool, destrutivo bool) ON COMMIT DROP;
  INSERT INTO residuo_casos VALUES
    ('dono',     u_dono,  true,  true,  true,  true),
    ('gerente',  u_ger,   true,  true,  true,  false),
    ('recepcao', u_rec,   true,  true,  false, false),
    ('barbeiro', u_barb,  true,  true,  false, false),
    ('restrito', u_restr, true,  false, false, false),
    ('estranho', u_fora,  false, false, false, false);
  GRANT SELECT ON residuo_casos TO authenticated;
  INSERT INTO public.clientes (tenant_id, nome, telefone)
  SELECT t, 'apagar-' || papel, '55117' || lpad((row_number() OVER ())::text, 8, '0') FROM residuo_casos;

  FOR r IN SELECT * FROM residuo_casos LOOP
    dia := dia + 1;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', r.uid, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    -- leitura da equipe segue igual
    SELECT count(*) INTO n FROM public.clientes WHERE id = cli;
    total := total + 1; IF (n = 1) <> r.membro THEN falhas := falhas || format('%s lê %s clientes', r.papel, n); END IF;

    -- clientes
    BEGIN INSERT INTO public.clientes (tenant_id, nome, telefone) VALUES (t, 'Novo ' || r.papel, '5511800' || dia); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.cliente THEN falhas := falhas || format('%s criar cliente (esperado %s)', r.papel, r.cliente); END IF;
    BEGIN UPDATE public.clientes SET nome = 'Cliente ' || r.papel WHERE id = cli; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.cliente THEN falhas := falhas || format('%s editar cliente (esperado %s)', r.papel, r.cliente); END IF;

    -- preferências de aviso do cliente (lado da equipe)
    BEGIN INSERT INTO public.preferencias_do_cliente_avisos (cliente_id, tenant_id)
          SELECT id, t FROM public.clientes WHERE tenant_id = t AND nome = 'apagar-' || r.papel; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.cliente THEN falhas := falhas || format('%s gravar avisos do cliente (esperado %s)', r.papel, r.cliente); END IF;

    -- bloqueios
    BEGIN INSERT INTO public.bloqueios_de_agenda (tenant_id, profissional_id, inicio, fim)
          VALUES (t, prof, now() + make_interval(days => dia), now() + make_interval(days => dia, hours => 1)); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.cliente THEN falhas := falhas || format('%s bloquear horário (esperado %s)', r.papel, r.cliente); END IF;
    BEGIN DELETE FROM public.bloqueios_de_agenda WHERE tenant_id = t; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    -- sem permissão: ou não havia bloqueio criado, ou não pode apagar o de outro papel
    IF NOT r.cliente THEN
      total := total + 1; IF ok THEN falhas := falhas || format('%s apagou bloqueio', r.papel); END IF;
    END IF;

    -- fila de espera
    BEGIN INSERT INTO public.fila_de_espera (tenant_id, cliente_id) VALUES (t, cli); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.cliente THEN falhas := falhas || format('%s pôr na fila (esperado %s)', r.papel, r.cliente); END IF;

    -- escalas
    BEGIN INSERT INTO public.escalas_de_profissional (tenant_id, profissional_id, dia_semana, trabalha)
          VALUES (t, prof, dia % 7, false); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.catalogo THEN falhas := falhas || format('%s mudar escala (esperado %s)', r.papel, r.catalogo); END IF;

    -- indicações
    BEGIN INSERT INTO public.indicacoes (tenant_id, indicado_nome) VALUES (t, 'Indicado ' || r.papel); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.catalogo THEN falhas := falhas || format('%s registrar indicação (esperado %s)', r.papel, r.catalogo); END IF;

    -- onboarding
    BEGIN UPDATE public.onboarding_do_tenant SET atualizado_em = now() WHERE tenant_id = t; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.catalogo THEN falhas := falhas || format('%s mudar onboarding (esperado %s)', r.papel, r.catalogo); END IF;

    -- exclusão de cliente
    BEGIN DELETE FROM public.clientes WHERE tenant_id = t AND nome = 'apagar-' || r.papel; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.destrutivo THEN falhas := falhas || format('%s excluir cliente (esperado %s)', r.papel, r.destrutivo); END IF;

    EXECUTE 'RESET ROLE';
  END LOOP;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'RESIDUO OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'RESIDUO FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$res$;
