-- Tokens das redes sociais só para o servidor (achado C1, migração 0034).
-- Mesmo formato dos outros testes: termina com RAISE EXCEPTION '... OK' ou '... FALHOU'.
DO $priv$
DECLARE falhas text[] := '{}'; total int := 0;
BEGIN
  total := total + 4;
  IF has_column_privilege('authenticated', 'public.conexoes_sociais', 'token_acesso', 'SELECT') THEN falhas := falhas || 'equipe lê token_acesso'::text; END IF;
  IF has_column_privilege('authenticated', 'public.conexoes_sociais', 'token_refresh', 'SELECT') THEN falhas := falhas || 'equipe lê token_refresh'::text; END IF;
  IF has_table_privilege('anon', 'public.conexoes_sociais', 'SELECT') THEN falhas := falhas || 'anônimo lê conexoes_sociais'::text; END IF;
  IF has_table_privilege('authenticated', 'public.conexoes_sociais', 'INSERT,UPDATE,DELETE,TRUNCATE') THEN falhas := falhas || 'equipe escreve em conexoes_sociais'::text; END IF;

  -- A tela de conexões continua lendo as colunas seguras.
  total := total + 2;
  IF NOT has_column_privilege('authenticated', 'public.conexoes_sociais', 'conta_nome', 'SELECT') THEN falhas := falhas || 'equipe perdeu conta_nome'::text; END IF;
  IF NOT has_column_privilege('authenticated', 'public.conexoes_sociais', 'expira_em', 'SELECT') THEN falhas := falhas || 'equipe perdeu expira_em'::text; END IF;

  -- O servidor continua lendo e gravando tudo.
  total := total + 1;
  IF NOT has_table_privilege('service_role', 'public.conexoes_sociais', 'SELECT,INSERT,UPDATE,DELETE') THEN falhas := falhas || 'servidor perdeu acesso'::text; END IF;

  IF array_length(falhas, 1) IS NULL THEN
    RAISE EXCEPTION 'PRIVILEGIOS OK: % verificações', total;
  ELSE
    RAISE EXCEPTION 'PRIVILEGIOS FALHOU (% de %): %', array_length(falhas,1), total, array_to_string(falhas, ' | ');
  END IF;
END
$priv$;
