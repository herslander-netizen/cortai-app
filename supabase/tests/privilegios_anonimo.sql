-- Visitante anônimo só lê as colunas públicas de tenants, servicos e profissionais
-- (achados C2 de 16/10 e 12 de 09/10, migração 0035).
-- Mesmo formato dos outros testes: termina com RAISE EXCEPTION '... OK' ou '... FALHOU'.
DO $anon$
DECLARE falhas text[] := '{}'; total int := 0; t uuid := gen_random_uuid(); n int; ok boolean;
BEGIN
  -- Colunas internas fechadas
  total := total + 5;
  IF has_column_privilege('anon', 'public.tenants', 'plano', 'SELECT') THEN falhas := falhas || 'anon lê tenants.plano'::text; END IF;
  IF has_column_privilege('anon', 'public.tenants', 'desconto_percentual', 'SELECT') THEN falhas := falhas || 'anon lê tenants.desconto_percentual'::text; END IF;
  IF has_column_privilege('anon', 'public.servicos', 'comissao_percentual', 'SELECT') THEN falhas := falhas || 'anon lê servicos.comissao_percentual'::text; END IF;
  IF has_column_privilege('anon', 'public.profissionais', 'user_id', 'SELECT') THEN falhas := falhas || 'anon lê profissionais.user_id'::text; END IF;
  IF has_table_privilege('anon', 'public.tenants', 'INSERT') OR has_table_privilege('anon', 'public.servicos', 'UPDATE')
     OR has_table_privilege('anon', 'public.profissionais', 'DELETE') THEN falhas := falhas || 'anon com privilégio de escrita'::text; END IF;

  -- Colunas públicas continuam abertas
  total := total + 3;
  IF NOT has_column_privilege('anon', 'public.tenants', 'slug', 'SELECT') THEN falhas := falhas || 'anon perdeu tenants.slug'::text; END IF;
  IF NOT has_column_privilege('anon', 'public.servicos', 'preco_centavos', 'SELECT') THEN falhas := falhas || 'anon perdeu servicos.preco_centavos'::text; END IF;
  IF NOT has_column_privilege('anon', 'public.profissionais', 'avatar_url', 'SELECT') THEN falhas := falhas || 'anon perdeu profissionais.avatar_url'::text; END IF;

  -- Na prática: como anon, ler colunas públicas funciona e a interna é recusada
  INSERT INTO public.tenants (id, nome, slug, ativo) VALUES (t, 'Teste anônimo', 'teste-anon-' || substr(t::text, 1, 8), true);
  EXECUTE 'SET LOCAL ROLE anon';
  total := total + 3;
  SELECT count(*) INTO n FROM public.tenants WHERE id = t;
  IF n <> 1 THEN falhas := falhas || 'anon não vê negócio ativo'::text; END IF;
  BEGIN PERFORM plano FROM public.tenants WHERE id = t; ok := true;
  EXCEPTION WHEN insufficient_privilege THEN ok := false; END;
  IF ok THEN falhas := falhas || 'anon leu plano na consulta'::text; END IF;
  BEGIN SELECT count(*) INTO n FROM public.servicos WHERE tenant_id = t; ok := true;  -- a política consulta tenants
  EXCEPTION WHEN insufficient_privilege THEN ok := false; END;
  IF NOT ok THEN falhas := falhas || 'anon não consegue listar serviços'::text; END IF;
  EXECUTE 'RESET ROLE';

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'ANONIMO OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'ANONIMO FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$anon$;
