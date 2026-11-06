-- Governança de consentimento WhatsApp (migration 0058).
-- O bloco sempre termina com erro proposital: a transação de ensaio é revertida.
-- Resultado esperado: "CONSENTIMENTO OK: N verificações".
DO $consentimento$
DECLARE
  t uuid := gen_random_uuid();
  t2 uuid := gen_random_uuid();
  evento_id uuid := gen_random_uuid();
  supressao_id uuid := gen_random_uuid();
  falhas text[] := '{}';
  total int := 0;
  ok boolean;
  n int;
  habilitada boolean;
BEGIN
  INSERT INTO public.tenants (id, nome, slug)
  VALUES
    (t, 'Consentimento Teste', 'consentimento-' || substr(t::text, 1, 8)),
    (t2, 'Consentimento Teste 2', 'consentimento-' || substr(t2::text, 1, 8));

  -- Consentimento válido guarda finalidade, ação, origem, texto e evidência.
  INSERT INTO public.whatsapp_consent_events (
    id, tenant_id, phone_e164, purpose, action, source, evidence, consent_text
  ) VALUES (
    evento_id, t, '+5579991234567', 'avisos_agendamento', 'concedido',
    'ensaio_sql', '{"captura":"checkbox explicito"}'::jsonb,
    'O cliente autorizou receber avisos de agendamento deste estabelecimento.'
  );
  SELECT count(*) INTO n
    FROM public.whatsapp_consent_events
    WHERE id = evento_id AND tenant_id = t
      AND phone_e164 = '+5579991234567'
      AND purpose = 'avisos_agendamento' AND action = 'concedido';
  total := total + 1;
  IF n <> 1 THEN falhas := falhas || 'não registrou consentimento com finalidade e evidência'::text; END IF;

  -- Histórico não pode ser alterado nem apagado, mesmo com acesso de serviço.
  BEGIN
    UPDATE public.whatsapp_consent_events SET action = 'revogado' WHERE id = evento_id;
    ok := true;
  EXCEPTION WHEN raise_exception THEN ok := false;
  END;
  total := total + 1;
  IF ok THEN falhas := falhas || 'permitiu editar evento de consentimento'::text; END IF;

  BEGIN
    DELETE FROM public.whatsapp_consent_events WHERE id = evento_id;
    ok := true;
  EXCEPTION WHEN raise_exception THEN ok := false;
  END;
  total := total + 1;
  IF ok THEN falhas := falhas || 'permitiu apagar evento de consentimento'::text; END IF;

  -- Concessão sem texto de evidência é inválida.
  BEGIN
    INSERT INTO public.whatsapp_consent_events (
      tenant_id, phone_e164, purpose, action, source, evidence
    ) VALUES (
      t, '+5579991234568', 'marketing', 'concedido', 'ensaio_sql', '{}'::jsonb
    );
    ok := true;
  EXCEPTION WHEN check_violation THEN ok := false;
  END;
  total := total + 1;
  IF ok THEN falhas := falhas || 'aceitou concessão sem texto de consentimento'::text; END IF;

  -- Finalidade fora do catálogo é inválida.
  BEGIN
    INSERT INTO public.whatsapp_consent_events (
      tenant_id, phone_e164, purpose, action, source, evidence
    ) VALUES (
      t, '+5579991234569', 'todas', 'revogado', 'ensaio_sql', '{}'::jsonb
    );
    ok := true;
  EXCEPTION WHEN check_violation THEN ok := false;
  END;
  total := total + 1;
  IF ok THEN falhas := falhas || 'aceitou finalidade desconhecida'::text; END IF;

  -- Supressão é independente do cliente e tem uma única linha ativa por tenant/telefone.
  INSERT INTO public.whatsapp_suppressions (
    id, tenant_id, phone_e164, reason, source, evidence
  ) VALUES (
    supressao_id, t, '+5579991234567', 'opt_out', 'ensaio_sql',
    '{"comando":"SAIR","sem_cadastro":true}'::jsonb
  );
  SELECT count(*) INTO n
    FROM public.whatsapp_suppressions
    WHERE tenant_id = t AND phone_e164 = '+5579991234567' AND released_at IS NULL;
  total := total + 1;
  IF n <> 1 THEN falhas := falhas || 'não persistiu supressão sem cliente'::text; END IF;

  BEGIN
    INSERT INTO public.whatsapp_suppressions (
      tenant_id, phone_e164, reason, source, evidence
    ) VALUES (
      t, '+5579991234567', 'opt_out', 'ensaio_sql', '{}'::jsonb
    );
    ok := true;
  EXCEPTION WHEN unique_violation THEN ok := false;
  END;
  total := total + 1;
  IF ok THEN falhas := falhas || 'permitiu duas supressões ativas iguais'::text; END IF;

  UPDATE public.whatsapp_suppressions
    SET released_at = now(), release_evidence = '{"novo_consentimento":true}'::jsonb
    WHERE id = supressao_id;
  INSERT INTO public.whatsapp_suppressions (
    tenant_id, phone_e164, reason, source, evidence
  ) VALUES (
    t, '+5579991234567', 'opt_out', 'ensaio_sql', '{}'::jsonb
  );
  SELECT count(*) INTO n
    FROM public.whatsapp_suppressions
    WHERE tenant_id = t AND phone_e164 = '+5579991234567' AND released_at IS NULL;
  total := total + 1;
  IF n <> 1 THEN falhas := falhas || 'não permitiu nova supressão após liberação auditada'::text; END IF;

  -- A supressão é por estabelecimento: o mesmo telefone pode ter estado diferente em outro tenant.
  INSERT INTO public.whatsapp_suppressions (
    tenant_id, phone_e164, reason, source, evidence
  ) VALUES (
    t2, '+5579991234567', 'opt_out', 'ensaio_sql', '{"tenant":"outro"}'::jsonb
  );
  SELECT count(*) INTO n
    FROM public.whatsapp_suppressions
    WHERE tenant_id = t2 AND phone_e164 = '+5579991234567' AND released_at IS NULL;
  total := total + 1;
  IF n <> 1 THEN falhas := falhas || 'supressão vazou ou colidiu entre tenants'::text; END IF;

  -- Número fora do padrão E.164 é rejeitado.
  BEGIN
    INSERT INTO public.whatsapp_suppressions (
      tenant_id, phone_e164, reason, source, evidence
    ) VALUES (
      t, '79991234567', 'opt_out', 'ensaio_sql', '{}'::jsonb
    );
    ok := true;
  EXCEPTION WHEN check_violation THEN ok := false;
  END;
  total := total + 1;
  IF ok THEN falhas := falhas || 'aceitou telefone sem E.164'::text; END IF;

  -- Segurança: RLS ligado, escrita/leitura do cliente autenticado revogada e servidor autorizado.
  SELECT c.relrowsecurity INTO habilitada
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relname = 'whatsapp_consent_events';
  total := total + 1;
  IF habilitada IS DISTINCT FROM true THEN falhas := falhas || 'RLS desligado no ledger'::text; END IF;

  SELECT c.relrowsecurity INTO habilitada
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relname = 'whatsapp_suppressions';
  total := total + 1;
  IF habilitada IS DISTINCT FROM true THEN falhas := falhas || 'RLS desligado na supressão'::text; END IF;

  total := total + 1;
  IF has_table_privilege('authenticated', 'public.whatsapp_consent_events', 'SELECT')
     OR has_table_privilege('authenticated', 'public.whatsapp_consent_events', 'INSERT')
  THEN falhas := falhas || 'cliente autenticado tem acesso direto ao ledger'::text; END IF;

  total := total + 1;
  IF has_table_privilege('anon', 'public.whatsapp_suppressions', 'SELECT')
     OR has_table_privilege('anon', 'public.whatsapp_suppressions', 'INSERT')
  THEN falhas := falhas || 'anon tem acesso direto à supressão'::text; END IF;

  total := total + 1;
  IF NOT has_table_privilege('service_role', 'public.whatsapp_consent_events', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.whatsapp_suppressions', 'INSERT')
  THEN falhas := falhas || 'service_role não pode registrar eventos e supressões'::text; END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'CONSENTIMENTO OK: % verificações', total;
  END IF;
  RAISE EXCEPTION 'CONSENTIMENTO FALHOU (% verificações): %',
    array_length(falhas, 1), array_to_string(falhas, ' | ');
END
$consentimento$;
