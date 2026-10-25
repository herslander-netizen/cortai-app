-- Pacotes e combos (migração 0046): RLS ligada e nenhum acesso direto do anônimo.
DO $$
DECLARE falhas int := 0; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pacotes', 'pacote_itens'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || t)::regclass) THEN
      RAISE NOTICE 'FALHOU: RLS desligada em %', t; falhas := falhas + 1;
    END IF;
    IF has_table_privilege('anon', 'public.' || t, 'SELECT') THEN
      RAISE NOTICE 'FALHOU: anon lê %', t; falhas := falhas + 1;
    END IF;
    IF NOT has_table_privilege('authenticated', 'public.' || t, 'SELECT') THEN
      RAISE NOTICE 'FALHOU: authenticated não lê %', t; falhas := falhas + 1;
    END IF;
    IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t) < 4 THEN
      RAISE NOTICE 'FALHOU: faltam políticas em %', t; falhas := falhas + 1;
    END IF;
  END LOOP;
  IF falhas > 0 THEN RAISE EXCEPTION 'PACOTES FALHOU: % verificações', falhas; END IF;
  RAISE EXCEPTION 'PACOTES OK: 8 verificações';
END $$;
