-- Testes de permissões por função (RLS + funções do banco).
-- Tudo roda dentro de um único bloco que SEMPRE termina com erro proposital,
-- então nada fica gravado. A mensagem final traz o placar:
--   "RBAC OK: N verificações"  -> todas passaram
--   "RBAC FALHOU: ..."         -> lista do que vazou
DO $rbac$
DECLARE
  t uuid := gen_random_uuid();
  u_dono uuid := gen_random_uuid(); u_ger uuid := gen_random_uuid();
  u_barb uuid := gen_random_uuid(); u_rec uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid();
  p_meu uuid := gen_random_uuid(); p_col uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid(); i1 uuid := gen_random_uuid(); i2 uuid := gen_random_uuid(); sv uuid := gen_random_uuid();
  falhas text[] := '{}'; total int := 0; n int; ok boolean;
BEGIN
  -- Cenário
  INSERT INTO auth.users (id, email, aud, role) VALUES
    (u_dono, u_dono||'@rbac.test','authenticated','authenticated'), (u_ger, u_ger||'@rbac.test','authenticated','authenticated'),
    (u_barb, u_barb||'@rbac.test','authenticated','authenticated'), (u_rec, u_rec||'@rbac.test','authenticated','authenticated'),
    (u_fora, u_fora||'@rbac.test','authenticated','authenticated');
  INSERT INTO public.tenants (id, nome, slug) VALUES (t, 'RBAC Teste', 'rbac-' || substr(t::text,1,8));
  -- Todos recebem o preset + chaves proibidas marcadas à força: o teto deve descartá-las.
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  SELECT t, u, p, public.permissoes_padrao(p) || ARRAY['gerenciar_plano','liberar_fiado','relatorios','comissao_visualizar_todas','visualizar_financeiro','gerenciar_permissoes'], true
  FROM (VALUES (u_dono,'dono'),(u_ger,'gerente'),(u_barb,'barbeiro'),(u_rec,'recepcao')) v(u,p);
  INSERT INTO public.profissionais (id, tenant_id, nome, user_id) VALUES (p_meu, t, 'Barbeiro', u_barb), (p_col, t, 'Colega', NULL);
  INSERT INTO public.clientes (id, tenant_id, nome, telefone) VALUES (cli, t, 'Cliente', '5511900000001');
  INSERT INTO public.comandas (id, tenant_id, numero, cliente_id, aberta_por, profissional_id) VALUES
    (c1, t, 99001, cli, u_dono, p_meu), (c2, t, 99002, cli, u_dono, p_col);
  INSERT INTO public.caixa_movimentos (tenant_id, tipo, categoria, descricao, valor_centavos, criado_por, profissional_id, criado_em) VALUES
    (t,'entrada','servico','hoje meu',1000,u_dono,p_meu,now()),
    (t,'entrada','servico','hoje colega',2000,u_dono,p_col,now()),
    (t,'entrada','servico','anteontem colega',3000,u_dono,p_col,now() - interval '2 days');
  INSERT INTO public.servicos (id, tenant_id, nome) VALUES (sv, t, 'Corte');
  INSERT INTO public.comanda_itens (id, comanda_id, servico_id, tipo, descricao, quantidade, valor_unitario_centavos, valor_total_centavos, comissao_percentual, comissao_centavos) VALUES
    (i1,c1,sv,'servico','Corte',1,1000,1000,50,500), (i2,c2,sv,'servico','Corte',1,2000,2000,50,1000);
  INSERT INTO public.comissoes (tenant_id, comanda_id, item_comanda_id, profissional_id, tipo_item, base_centavos, percentual, valor_centavos) VALUES
    (t,c1,i1,p_meu,'servico',1000,50,500), (t,c2,i2,p_col,'servico',2000,50,1000);

  CREATE TEMP TABLE IF NOT EXISTS rbac_casos (papel text, uid uuid, caixa int, comissoes int, comandas int,
    recebe bool, relatorios bool, financeiro bool, config bool, equipe bool, fiado bool, plano bool, excluir bool) ON COMMIT DROP;
  -- Expectativas: o que cada função PODE (true) e quantas linhas vê
  INSERT INTO rbac_casos VALUES
    ('dono',     u_dono, 3, 2, 2, true,  true,  true,  true,  true,  true,  true,  false), -- exclusão de barbearia: só suporte da plataforma
    ('gerente',  u_ger,  3, 2, 2, true,  true,  true,  true,  true,  false, false, false),
    ('recepcao', u_rec,  2, 0, 2, true,  false, false, false, false, false, false, false),
    ('barbeiro', u_barb, 1, 1, 1, false, false, false, false, false, false, false, false),
    ('estranho', u_fora, 0, 0, 0, false, false, false, false, false, false, false, false);
  GRANT SELECT ON rbac_casos TO authenticated;

  DECLARE r record;
  BEGIN
  FOR r IN SELECT * FROM rbac_casos LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', r.uid, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    SELECT count(*) INTO n FROM public.caixa_movimentos WHERE tenant_id = t; total := total + 1;
    IF n <> r.caixa THEN falhas := falhas || format('%s lê %s movimentos do caixa (esperado %s)', r.papel, n, r.caixa); END IF;
    SELECT count(*) INTO n FROM public.comissoes WHERE tenant_id = t; total := total + 1;
    IF n <> r.comissoes THEN falhas := falhas || format('%s lê %s comissões (esperado %s)', r.papel, n, r.comissoes); END IF;
    SELECT count(*) INTO n FROM public.comandas WHERE tenant_id = t; total := total + 1;
    IF n <> r.comandas THEN falhas := falhas || format('%s lê %s comandas (esperado %s)', r.papel, n, r.comandas); END IF;

    total := total + 3;
    IF public.has_tenant_permission(t,'confirmar_pagamento') <> r.recebe THEN falhas := falhas || format('%s receber pagamento', r.papel); END IF;
    IF public.has_tenant_permission(t,'relatorios') <> r.relatorios THEN falhas := falhas || format('%s relatórios', r.papel); END IF;
    IF public.has_tenant_permission(t,'comissao_visualizar_todas') <> r.financeiro THEN falhas := falhas || format('%s comissões de todos', r.papel); END IF;

    -- Configurações
    BEGIN INSERT INTO public.regras_de_plano (tenant_id, tipo) VALUES (t, 'mensal'); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.config THEN falhas := falhas || format('%s alterar configurações', r.papel); END IF;

    -- Equipe
    BEGIN PERFORM public.definir_barbeiro_recebe(t, false); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.equipe THEN falhas := falhas || format('%s mudar regra de recebimento', r.papel); END IF;
    BEGIN PERFORM public.definir_acesso_membro(t, u_rec, 'recepcao', public.permissoes_padrao('recepcao'), true); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.equipe THEN falhas := falhas || format('%s gerenciar equipe', r.papel); END IF;

    -- Fiado (só dono)
    BEGIN UPDATE public.clientes SET limite_fiado_centavos = limite_fiado_centavos + 100 WHERE id = cli; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.fiado THEN falhas := falhas || format('%s liberar fiado', r.papel); END IF;

    -- Plano (só dono)
    BEGIN UPDATE public.tenants SET plano = plano WHERE id = t; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.plano THEN falhas := falhas || format('%s trocar plano', r.papel); END IF;
    total := total + 1;
    IF public.has_tenant_permission(t,'gerenciar_plano') <> r.plano THEN falhas := falhas || format('%s permissão de plano', r.papel); END IF;

    -- Excluir barbearia (ninguém da equipe; só suporte da plataforma)
    BEGIN DELETE FROM public.tenants WHERE id = t; ok := FOUND;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> r.excluir THEN falhas := falhas || format('%s excluir barbearia', r.papel); END IF;

    EXECUTE 'RESET ROLE';
  END LOOP;
  END;

  -- Barbearia libera: barbeiro passa a receber
  UPDATE public.configuracoes_financeiras SET barbeiro_recebe = true WHERE tenant_id = t;
  IF NOT FOUND THEN INSERT INTO public.configuracoes_financeiras (tenant_id, barbeiro_recebe) VALUES (t, true); END IF;
  total := total + 1;
  IF NOT public.permissao_efetiva(u_barb, t, 'confirmar_pagamento') THEN falhas := falhas || 'barbeiro não recebe mesmo liberado'::text; END IF;

  -- Teto: chaves proibidas gravadas foram descartadas
  total := total + 2;
  IF (SELECT 'relatorios' = ANY(permissoes) FROM public.tenant_usuarios WHERE user_id = u_barb) THEN falhas := falhas || 'barbeiro guardou relatórios'::text; END IF;
  IF (SELECT 'liberar_fiado' = ANY(permissoes) FROM public.tenant_usuarios WHERE user_id = u_ger) THEN falhas := falhas || 'gerente guardou liberar fiado'::text; END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'RBAC OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'RBAC FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$rbac$;
