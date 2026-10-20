-- Convite de equipe e consulta de papéis sem descobrir contas alheias (achados N6 e C6 de 16/10,
-- migração 0037). Termina sempre com erro proposital: "EQUIPE OK" ou "EQUIPE FALHOU".
DO $eq$
DECLARE
  t uuid := gen_random_uuid(); u_dono uuid := gen_random_uuid(); u_barb uuid := gen_random_uuid();
  u_admin uuid := gen_random_uuid(); u_novo uuid := gen_random_uuid();
  msg text; ok boolean; falhas text[] := '{}'; total int := 0;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES
    (u_dono, u_dono||'@eq.test', 'authenticated', 'authenticated'),
    (u_barb, u_barb||'@eq.test', 'authenticated', 'authenticated'),
    (u_admin, u_admin||'@eq.test', 'authenticated', 'authenticated'),
    (u_novo, 'novo-'||u_novo||'@eq.test', 'authenticated', 'authenticated');
  INSERT INTO public.tenants (id, nome, slug) VALUES (t, 'Equipe Teste', 'eq-' || substr(t::text, 1, 8));
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo) VALUES
    (t, u_dono, 'dono', public.permissoes_padrao('dono'), true),
    (t, u_barb, 'barbeiro', public.permissoes_padrao('barbeiro'), true);
  INSERT INTO public.user_roles (user_id, role) VALUES (u_admin, 'admin');

  -- N6: profissional sem permissão recebe a mesma recusa, exista ou não a conta
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_barb, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN PERFORM public.convidar_membro(t, 'ninguem-'||t||'@eq.test', 'recepcao'); msg := 'aceitou';
  EXCEPTION WHEN others THEN msg := SQLERRM; END;
  total := total + 2;
  IF msg <> 'sem permissao' THEN falhas := falhas || format('e-mail sem conta respondeu "%s"', msg); END IF;
  BEGIN PERFORM public.convidar_membro(t, 'novo-'||u_novo||'@eq.test', 'recepcao'); msg := 'aceitou';
  EXCEPTION WHEN others THEN msg := SQLERRM; END;
  IF msg <> 'sem permissao' THEN falhas := falhas || format('e-mail com conta respondeu "%s"', msg); END IF;

  -- C6: com sessão de usuário, has_role só responde sobre a própria conta
  total := total + 1;
  IF public.has_role(u_admin, 'admin') THEN falhas := falhas || 'profissional descobriu quem é admin'::text; END IF;
  EXECUTE 'RESET ROLE';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  total := total + 1;
  IF NOT public.has_role(u_admin, 'admin') THEN falhas := falhas || 'admin não se reconhece como admin'::text; END IF;
  EXECUTE 'RESET ROLE';

  -- Dono continua convidando normalmente
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u_dono, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN PERFORM public.convidar_membro(t, 'ninguem-'||t||'@eq.test', 'recepcao'); msg := 'aceitou';
  EXCEPTION WHEN others THEN msg := SQLERRM; END;
  total := total + 2;
  IF msg <> 'conta nao encontrada' THEN falhas := falhas || format('dono, e-mail sem conta: "%s"', msg); END IF;
  BEGIN PERFORM public.convidar_membro(t, 'novo-'||u_novo||'@eq.test', 'recepcao'); ok := true;
  EXCEPTION WHEN others THEN ok := false; msg := SQLERRM; END;
  IF NOT ok THEN falhas := falhas || format('dono não convidou conta existente: "%s"', msg); END IF;
  EXECUTE 'RESET ROLE';

  -- Servidor (sem usuário na sessão) continua consultando qualquer conta
  PERFORM set_config('request.jwt.claims', '', true);
  total := total + 1;
  IF NOT public.has_role(u_admin, 'admin') THEN falhas := falhas || 'servidor não consulta papel'::text; END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'EQUIPE OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'EQUIPE FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$eq$;
