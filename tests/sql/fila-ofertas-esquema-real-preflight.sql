-- Somente leitura. Rodar manualmente no Supabase de PREVIA antes de qualquer
-- homologacao de RPCs da fila. Sem dados pessoais, migrations, DML ou secrets.
-- Este teste confirma CONTRATOS observados, nao executa gatilhos nem autoriza deploy.
-- As inconsistencias dos registros devem ser verificadas separadamente em
-- tests/sql/fila-ofertas-preflight-leitura.sql.
WITH
requisitos(tabela,coluna,tipo) AS (
  VALUES
    ('fila_de_espera','id','uuid'),
    ('fila_de_espera','tenant_id','uuid'),
    ('fila_de_espera','cliente_id','uuid'),
    ('fila_de_espera','janela_preferida','jsonb'),
    ('fila_de_espera','status','text'),
    ('ofertas_da_fila','fila_id','uuid'),
    ('ofertas_da_fila','tenant_id','uuid'),
    ('ofertas_da_fila','agendamento_liberado_id','uuid'),
    ('ofertas_da_fila','agendamento_criado_id','uuid'),
    ('ofertas_da_fila','status','text'),
    ('ofertas_da_fila','token','text'),
    ('ofertas_da_fila','expira_em','timestamptz'),
    ('agendamentos','origem_fila_id','uuid'),
    ('agendamentos','profissional_id','uuid'),
    ('agendamentos','cliente_id','uuid'),
    ('agendamentos','servico_id','uuid'),
    ('agendamentos','inicio','timestamptz'),
    ('agendamentos','fim','timestamptz'),
    ('agendamentos','status','text'),
    ('profissionais','ativo','bool'),
    ('servicos','ativo','bool'),
    ('servicos','duracao_min','int4'),
    ('tenants','espera_qualquer_profissional','bool'),
    ('tenants','intervalo_entre_min','int4'),
    ('tenants','fuso','text')
),
faltantes AS (
  SELECT r.tabela || '.' || r.coluna AS item
  FROM requisitos r
  LEFT JOIN information_schema.columns c
    ON c.table_schema='public' AND c.table_name=r.tabela
   AND c.column_name=r.coluna AND c.udt_name=r.tipo
  WHERE c.column_name IS NULL
),
rls AS (
  SELECT count(*)=7 AS ok
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND c.relname IN ('fila_de_espera','ofertas_da_fila','agendamentos',
                      'clientes','profissionais','servicos','tenants')
    AND c.relrowsecurity
),
checks AS (
  SELECT count(*)=3 AS ok
  FROM pg_constraint c
  WHERE (c.conrelid='public.agendamentos'::regclass AND c.conname='agendamentos_status_check')
     OR (c.conrelid='public.fila_de_espera'::regclass AND c.conname='fila_de_espera_status_check')
     OR (c.conrelid='public.ofertas_da_fila'::regclass AND c.conname='ofertas_da_fila_status_check')
),
vaga_indice AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_class idx ON idx.oid=i.indexrelid
    WHERE i.indrelid='public.ofertas_da_fila'::regclass
      AND idx.relname='ofertas_da_fila_uma_ativa_por_vaga'
      AND i.indisunique
      AND pg_get_expr(i.indpred,i.indrelid) LIKE '%enviada%'
  ) AS ok
),
gatilhos AS (
  SELECT count(*)=4 AS ok FROM pg_trigger t
  WHERE t.tgrelid='public.agendamentos'::regclass
    AND NOT t.tgisinternal AND t.tgenabled <> 'D'
    AND t.tgname IN ('trg_agendamento_maquina_estados',
                     'trg_agendamento_proteger_colunas_sensiveis',
                     'trg_agendamento_criar_comanda',
                     'trg_impedir_agendamento_cliente_bloqueado')
),
rpc AS (
  SELECT (
    to_regprocedure('public.criar_agendamento(uuid,uuid,uuid,uuid,timestamptz,text,boolean,boolean)') IS NOT NULL
    AND to_regprocedure('public.aceitar_oferta_da_fila(text)') IS NOT NULL
    AND to_regprocedure('public.chamada_do_servidor()') IS NOT NULL
  ) AS presentes,
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='criar_agendamento'
      AND pg_get_functiondef(p.oid) LIKE '%pg_advisory_xact_lock(hashtextextended(''agenda:'' || _profissional_id::text, 0))%'
  ) AS trava_compativel
),
privilegios AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='aceitar_oferta_da_fila'
      AND p.prosecdef AND has_function_privilege('service_role',p.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
  ) AS ok
)
SELECT
  (SELECT count(*)::int FROM requisitos) AS colunas_esperadas,
  (SELECT count(*)::int FROM faltantes) AS colunas_ausentes_ou_tipo_incorreto,
  (SELECT coalesce(jsonb_agg(item ORDER BY item),'[]'::jsonb) FROM faltantes) AS lista_ausentes,
  (SELECT ok FROM rls) AS rls_nas_7_tabelas,
  (SELECT ok FROM checks) AS checks_estado_presentes,
  (SELECT ok FROM vaga_indice) AS indice_unico_vaga_ativa,
  (SELECT ok FROM gatilhos) AS gatilhos_criticos_presentes,
  (SELECT presentes FROM rpc) AS rpcs_basicas_presentes,
  (SELECT trava_compativel FROM rpc) AS trava_agenda_compativel,
  (SELECT ok FROM privilegios) AS aceite_servidor_apenas,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='fila_de_espera'
      AND column_name='oferta_atual_id' AND udt_name='uuid'
  ) AS coluna_oferta_atual_ja_instalada,
  (SELECT count(*)=0 FROM faltantes)
    AND (SELECT ok FROM rls)
    AND (SELECT ok FROM checks)
    AND (SELECT ok FROM vaga_indice)
    AND (SELECT ok FROM gatilhos)
    AND (SELECT presentes AND trava_compativel FROM rpc)
    AND (SELECT ok FROM privilegios)
    AS contrato_minimo_pronto_para_revisao;
