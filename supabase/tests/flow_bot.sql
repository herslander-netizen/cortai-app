-- Flow Bot dentro do Flow (migração 0055). Termina sempre com erro proposital:
-- "FLOW BOT OK: N verificações" ou "FLOW BOT FALHOU (...)". Nada fica gravado.
DO $fb$
DECLARE
  t uuid := gen_random_uuid(); outro uuid := gen_random_uuid();
  u_dono uuid := gen_random_uuid(); u_rec uuid := gen_random_uuid(); u_fora uuid := gen_random_uuid();
  conv uuid := gen_random_uuid();
  falhas text[] := '{}'; total int := 0; ok boolean; n int; pode boolean;
  r record;
BEGIN
  INSERT INTO auth.users (id, email, aud, role)
  SELECT u, u || '@flowbot.test', 'authenticated', 'authenticated' FROM unnest(ARRAY[u_dono, u_rec, u_fora]) u;
  INSERT INTO public.tenants (id, nome, slug) VALUES
    (t, 'Bot Teste', 'bot-' || substr(t::text, 1, 8)),
    (outro, 'Outro Bot', 'bot-' || substr(outro::text, 1, 8));
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo) VALUES
    (t, u_dono, 'dono', public.permissoes_padrao('dono'), true),
    (t, u_rec, 'recepcao', public.permissoes_padrao('recepcao'), true),
    (outro, u_fora, 'dono', public.permissoes_padrao('dono'), true);
  INSERT INTO public.conversas_whatsapp (id, tenant_id, telefone) VALUES (conv, t, '5511900000077');
  INSERT INTO public.flow_bot_sessoes (conversa_id, tenant_id, fluxo_ref, sessao) VALUES (conv, t, 'padrao', '{}');
  INSERT INTO public.flow_bot_rastro (tenant_id, conversa_id, modo, fluxo_ref, motivo) VALUES (t, conv, 'sombra', 'padrao', 'concluida');

  -- Padrões: começa desligado, horário "sempre", pausa de 2 h.
  INSERT INTO public.flow_bot_config (tenant_id) VALUES (outro);
  SELECT count(*) INTO n FROM public.flow_bot_config WHERE tenant_id = outro AND modo = 'desligado' AND horario = 'sempre' AND pausa_humano_min = 120;
  total := total + 1; IF n <> 1 THEN falhas := falhas || 'padrões da config'::text; END IF;

  -- Valores fora da lista e versão publicada que não existe são recusados.
  BEGIN UPDATE public.flow_bot_config SET modo = 'turbo' WHERE tenant_id = outro; ok := true; EXCEPTION WHEN check_violation THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou modo inválido'::text; END IF;
  BEGIN UPDATE public.flow_bot_config SET versao_publicada = 9 WHERE tenant_id = outro; ok := true; EXCEPTION WHEN foreign_key_violation THEN ok := false; END;
  total := total + 1; IF ok THEN falhas := falhas || 'aceitou versão publicada inexistente'::text; END IF;

  FOR r IN SELECT * FROM (VALUES ('dono', u_dono, true), ('recepcao', u_rec, true), ('estranho', u_fora, false)) v(papel, uid, membro) LOOP
    SELECT coalesce(r.membro AND public.permissoes_padrao(r.papel) @> ARRAY['alterar_dados_barbearia'], false) INTO pode;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', r.uid, 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    -- Ligar o bot e publicar versão: só quem altera os dados do negócio.
    BEGIN
      INSERT INTO public.flow_bot_config (tenant_id, modo) VALUES (t, 'sombra')
      ON CONFLICT (tenant_id) DO UPDATE SET modo = 'sombra';
      ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> pode THEN falhas := falhas || format('%s ligar o bot (esperado %s)', r.papel, pode); END IF;
    BEGIN
      INSERT INTO public.flow_bot_versoes (tenant_id, versao, fluxo) VALUES (t, (SELECT coalesce(max(versao), 0) + 1 FROM public.flow_bot_versoes WHERE tenant_id = t), '{}');
      ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok <> pode THEN falhas := falhas || format('%s publicar versão (esperado %s)', r.papel, pode); END IF;

    -- Versão publicada não se edita nem se apaga.
    BEGIN UPDATE public.flow_bot_versoes SET nota = 'x' WHERE tenant_id = t; ok := FOUND; EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s editou versão publicada', r.papel); END IF;

    -- Rastro: a equipe lê; ninguém de fora lê; ninguém grava pela API.
    SELECT count(*) INTO n FROM public.flow_bot_rastro WHERE tenant_id = t;
    total := total + 1; IF (n = 1) <> r.membro THEN falhas := falhas || format('%s lê %s rastros', r.papel, n); END IF;
    BEGIN INSERT INTO public.flow_bot_rastro (tenant_id, conversa_id, modo, fluxo_ref, motivo) VALUES (t, conv, 'ligado', 'x', 'x'); ok := true;
    EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s gravou rastro pela API', r.papel); END IF;

    -- Conversa em andamento: só o servidor.
    BEGIN SELECT count(*) INTO n FROM public.flow_bot_sessoes; ok := n > 0; EXCEPTION WHEN others THEN ok := false; END;
    total := total + 1; IF ok THEN falhas := falhas || format('%s leu sessões do bot', r.papel); END IF;

    EXECUTE 'RESET ROLE';
  END LOOP;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'FLOW BOT OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'FLOW BOT FALHOU (% de %): %', array_length(falhas, 1), total, array_to_string(falhas, ' | ');
  END IF;
END
$fb$;
