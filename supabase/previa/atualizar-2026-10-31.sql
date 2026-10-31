-- Atualiza o banco de TESTES da prévia (cortai-preview, pfkxvindedkuktogbcsv) com as migrações que faltavam em 31/10/2026.
-- NÃO rodar no cortai-prod. Gerado a partir de drizzle/migrations (0043 fica de fora: tarefas agendadas).
-- Tudo numa transação: se algo falhar, nada fica gravado. Uso: SQL Editor do projeto cortai-preview → Run.
begin;
set local check_function_bodies = off;
-- ===== 0044_identidade_cloud.sql
-- Tema Cloud (23/10/2026): acrescenta "cloud" aos temas aceitos. Só amplia a lista; nenhuma linha muda.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_identidade_app_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_identidade_app_check
  CHECK (identidade_app IN ('moderno', 'rose', 'indigo', 'copper', 'classico', 'cloud'));
;
-- ===== 0045_intervalo_personalizado.sql
-- Permite personalizar a frequência dos horários oferecidos sem alterar a duração dos serviços.
-- Só amplia a validação da coluna existente; não altera nem remove dados.
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_passo_horarios_chk;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_passo_horarios_chk
  CHECK (passo_horarios_min BETWEEN 5 AND 120);
;
-- ===== 0046_pacotes_e_combos.sql
-- Pacotes (várias visitas, com validade) e combos (serviços juntos na mesma visita) vendidos pela
-- página do negócio (layout Raízes). Só acréscimo: duas tabelas novas, sem tocar em nada existente.
-- A página pública lê pelo servidor (service_role); a equipe lê com is_tenant_member e escreve com a
-- mesma permissão que edita a vitrine (alterar_dados_barbearia). Anônimo não tem acesso direto.

CREATE TABLE IF NOT EXISTS public.pacotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('pacote', 'combo')),
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 80),
  descricao text CHECK (descricao IS NULL OR char_length(descricao) <= 300),
  preco_centavos integer NOT NULL CHECK (preco_centavos >= 0),
  -- Só faz sentido no pacote: por quantos dias as visitas valem. Nulo = sem prazo.
  validade_dias integer CHECK (validade_dias IS NULL OR validade_dias BETWEEN 1 AND 730),
  destaque boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pacotes_tenant ON public.pacotes (tenant_id, ativo, ordem);

CREATE TABLE IF NOT EXISTS public.pacote_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id uuid NOT NULL REFERENCES public.pacotes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 50),
  UNIQUE (pacote_id, servico_id)
);
CREATE INDEX IF NOT EXISTS idx_pacote_itens_pacote ON public.pacote_itens (pacote_id);

-- Os privilégios padrão do Supabase dariam acesso ao anônimo: a página pública lê pelo servidor.
REVOKE ALL ON public.pacotes, public.pacote_itens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacotes, public.pacote_itens TO authenticated;
GRANT ALL ON public.pacotes, public.pacote_itens TO service_role;

ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacote_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe le pacotes" ON public.pacotes
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria pacotes" ON public.pacotes
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera pacotes" ON public.pacotes
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove pacotes" ON public.pacotes
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));

CREATE POLICY "equipe le itens de pacotes" ON public.pacote_itens
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria itens de pacotes" ON public.pacote_itens
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera itens de pacotes" ON public.pacote_itens
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove itens de pacotes" ON public.pacote_itens
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
;
-- ===== 0049_categorias_servicos.sql
-- Categorias personalizáveis por negócio; os serviços continuam ligados pelo rótulo legado.
-- Esta migração é aditiva e deve ser aplicada apenas após autorização explícita para a prévia.
CREATE TABLE IF NOT EXISTS public.categorias_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 2 AND 40),
  cor text NOT NULL CHECK (cor IN ('roxo','azul','verde','rosa','vermelho','amarelo','laranja','turquesa','cinza')),
  ordem integer NOT NULL DEFAULT 0 CHECK (ordem BETWEEN 0 AND 500),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categorias_servicos_tenant_nome_uidx
  ON public.categorias_servicos (tenant_id, lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS categorias_servicos_tenant_ordem_idx
  ON public.categorias_servicos (tenant_id, ordem, nome);

ALTER TABLE public.categorias_servicos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.categorias_servicos FROM anon, authenticated;
GRANT SELECT ON public.categorias_servicos TO authenticated;
GRANT ALL ON public.categorias_servicos TO service_role;

DROP POLICY IF EXISTS "membros leem categorias de servicos" ON public.categorias_servicos;
CREATE POLICY "membros leem categorias de servicos"
  ON public.categorias_servicos
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE OR REPLACE FUNCTION public.salvar_categoria_servicos(
  _tenant_id uuid,
  _categoria_id uuid,
  _nome_anterior text,
  _nome text,
  _cor text,
  _ordem integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_categoria public.categorias_servicos%ROWTYPE;
  v_nome_anterior text;
  v_nome text := btrim(_nome);
BEGIN
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'negocio invalido';
  END IF;
  IF v_nome IS NULL OR char_length(v_nome) < 2 OR char_length(v_nome) > 40 THEN
    RAISE EXCEPTION 'o nome deve ter entre 2 e 40 caracteres';
  END IF;
  IF _cor NOT IN ('roxo','azul','verde','rosa','vermelho','amarelo','laranja','turquesa','cinza') THEN
    RAISE EXCEPTION 'cor de categoria invalida';
  END IF;
  IF _ordem IS NULL OR _ordem < 0 OR _ordem > 500 THEN
    RAISE EXCEPTION 'ordem de categoria invalida';
  END IF;

  IF lower(v_nome) = 'outros serviços' THEN
    RAISE EXCEPTION 'a categoria padrao nao pode ser personalizada';
  END IF;

  IF _categoria_id IS NOT NULL THEN
    SELECT * INTO v_categoria
      FROM public.categorias_servicos
     WHERE id = _categoria_id
       AND tenant_id = _tenant_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'categoria nao encontrada para este negocio';
    END IF;
    v_nome_anterior := v_categoria.nome;
  ELSE
    v_nome_anterior := NULLIF(btrim(_nome_anterior), '');
  END IF;

  IF v_nome_anterior IS NOT NULL AND lower(btrim(v_nome_anterior)) = 'outros serviços' THEN
    RAISE EXCEPTION 'a categoria padrao nao pode ser personalizada';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.categorias_servicos c
     WHERE c.tenant_id = _tenant_id
       AND lower(btrim(c.nome)) = lower(v_nome)
       AND c.id IS DISTINCT FROM _categoria_id
  ) THEN
    RAISE EXCEPTION 'ja existe uma categoria com esse nome';
  END IF;

  IF v_nome_anterior IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.servicos s
       WHERE s.tenant_id = _tenant_id
         AND lower(btrim(COALESCE(s.categoria, ''))) = lower(v_nome)
    ) THEN
      RAISE EXCEPTION 'ja existe uma categoria com esse nome';
    END IF;
  ELSIF v_nome_anterior <> v_nome THEN
    IF EXISTS (
      SELECT 1 FROM public.servicos s
       WHERE s.tenant_id = _tenant_id
         AND lower(btrim(COALESCE(s.categoria, ''))) = lower(v_nome)
         AND lower(btrim(COALESCE(s.categoria, ''))) <> lower(btrim(v_nome_anterior))
    ) THEN
      RAISE EXCEPTION 'ja existe uma categoria com esse nome';
    END IF;
    UPDATE public.servicos
       SET categoria = v_nome
     WHERE tenant_id = _tenant_id
       AND categoria = v_nome_anterior;
  END IF;

  IF _categoria_id IS NULL THEN
    INSERT INTO public.categorias_servicos (tenant_id, nome, cor, ordem)
    VALUES (_tenant_id, v_nome, _cor, _ordem)
    RETURNING * INTO v_categoria;
  ELSE
    UPDATE public.categorias_servicos
       SET nome = v_nome, cor = _cor, ordem = _ordem
     WHERE id = _categoria_id
       AND tenant_id = _tenant_id
    RETURNING * INTO v_categoria;
  END IF;

  RETURN jsonb_build_object(
    'id', v_categoria.id,
    'nome', v_categoria.nome,
    'cor', v_categoria.cor,
    'ordem', v_categoria.ordem
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.salvar_categoria_servicos(uuid, uuid, text, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_categoria_servicos(uuid, uuid, text, text, text, integer)
  TO service_role;

COMMENT ON TABLE public.categorias_servicos IS
  'Categorias personalizadas por negócio; rótulos existentes em servicos.categoria permanecem compatíveis.';
;
-- ===== 0050_intervalos_agenda_dia.sql
CREATE TABLE IF NOT EXISTS public.intervalos_agenda_dia (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dia date NOT NULL,
  intervalo_inicio time without time zone NOT NULL,
  intervalo_fim time without time zone NOT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intervalos_agenda_dia_pk PRIMARY KEY (tenant_id, dia),
  CONSTRAINT intervalos_agenda_dia_horario_distinto CHECK (intervalo_inicio <> intervalo_fim)
);

CREATE INDEX IF NOT EXISTS intervalos_agenda_dia_dia_idx
  ON public.intervalos_agenda_dia (tenant_id, dia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intervalos_agenda_dia TO authenticated;

GRANT ALL ON public.intervalos_agenda_dia TO service_role;

ALTER TABLE public.intervalos_agenda_dia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membros leem intervalos por data" ON public.intervalos_agenda_dia;

CREATE POLICY "membros leem intervalos por data"
  ON public.intervalos_agenda_dia FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "membros criam intervalos por data" ON public.intervalos_agenda_dia;

CREATE POLICY "membros criam intervalos por data"
  ON public.intervalos_agenda_dia FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));

DROP POLICY IF EXISTS "membros atualizam intervalos por data" ON public.intervalos_agenda_dia;

CREATE POLICY "membros atualizam intervalos por data"
  ON public.intervalos_agenda_dia FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));

DROP POLICY IF EXISTS "membros removem intervalos por data" ON public.intervalos_agenda_dia;

CREATE POLICY "membros removem intervalos por data"
  ON public.intervalos_agenda_dia FOR DELETE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));

;
-- ===== 0051_marca_flow_textos.sql
-- Migração da marca Cortaí → Flow nos TEXTOS gravados no banco (decisão do dono de 29/10/2026).
-- Só troca o nome comercial em textos exibidos; não renomeia tabelas, colunas, chaves nem identificadores.
-- Idempotente: cada UPDATE só alcança linhas que ainda têm o nome antigo. NÃO APLICAR sem autorização do dono.

-- Vitrine de planos (descrição exibida na tela de planos).
UPDATE public.planos_da_plataforma
SET descricao = replace(replace(descricao, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow')
WHERE descricao LIKE '%Cortaí%' OR descricao LIKE '%CortAI%';


-- Negócio de demonstração (dados fictícios): nome, descrição e boas-vindas.
UPDATE public.tenants
SET nome = replace(nome, 'Cortaí', 'Flow'),
    descricao = replace(replace(descricao, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow'),
    texto_boas_vindas = replace(replace(texto_boas_vindas, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow')
WHERE id = '0de00000-0000-4000-8000-000000000001'
  AND (nome LIKE '%Cortaí%' OR descricao LIKE '%Cortaí%' OR texto_boas_vindas LIKE '%Cortaí%');


-- Mensagem de boas-vindas da IA (a assistente agora se apresenta como Flow IA).
UPDATE public.config_atendimento_ia
SET mensagem_boas_vindas = replace(
      replace(replace(mensagem_boas_vindas, 'o CortAI', 'a Flow IA'), 'CortAI', 'Flow IA'),
      'Cortaí', 'Flow')
WHERE mensagem_boas_vindas LIKE '%CortAI%' OR mensagem_boas_vindas LIKE '%Cortaí%';


-- Textos da home pública editados em /admin/home (rascunho e publicado).
UPDATE public.home_publica
SET rascunho = replace(replace(rascunho::text, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow')::jsonb,
    publicado = replace(replace(publicado::text, 'CortAI', 'Flow IA'), 'Cortaí', 'Flow')::jsonb
WHERE rascunho::text LIKE '%Cortaí%' OR publicado::text LIKE '%Cortaí%'
   OR rascunho::text LIKE '%CortAI%' OR publicado::text LIKE '%CortAI%';
;
-- ===== 0052_plano_flow_chat.sql
-- Plano Conecta: "Secretária Flow" passa a se chamar "Flow Chat" (decisão do dono, 30/10/2026: "Secretária Flow = Flow Chat").
-- Só troca o texto exibido na descrição do plano. Idempotente: só alcança linhas que ainda têm o nome antigo.
UPDATE public.planos_da_plataforma
SET descricao = replace(descricao, 'Secretária Flow', 'Flow Chat')
WHERE descricao LIKE '%Secretária Flow%';
;
-- ===== 0053_textos_flow_recursos_modelos.sql
-- Restos do nome antigo em textos exibidos (varredura de 30/10/2026). Só troca texto; idempotente.
-- Recurso dos planos: "Secretária Cortaí" = Flow Chat (decisão do dono, 30/10).
UPDATE public.recursos_de_plano
SET rotulo = replace(rotulo, 'Secretária Cortaí', 'Flow Chat')
WHERE rotulo LIKE '%Secretária Cortaí%';


-- Rodapé dos modelos de WhatsApp AINDA NÃO SUBMETIDOS à Meta (os aprovados não são tocados: o texto deles é o da Meta).
UPDATE public.modelos_whatsapp
SET rodape = replace(rodape, 'Cortaí', 'Flow')
WHERE rodape LIKE '%Cortaí%' AND status = 'NAO_SUBMETIDO';
;
-- ===== 0054_horarios_especiais.sql
-- Horários excepcionais por data: uma linha por negócio ou profissional.
CREATE TABLE IF NOT EXISTS public.horarios_especiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dia date NOT NULL,
  profissional_id uuid REFERENCES public.profissionais(id) ON DELETE CASCADE,
  alvo_id uuid GENERATED ALWAYS AS (coalesce(profissional_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
  abre time without time zone NOT NULL,
  fecha time without time zone NOT NULL,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT horarios_especiais_janela_valida CHECK (abre < fecha),
  CONSTRAINT horarios_especiais_alvo_unico UNIQUE (tenant_id, dia, alvo_id)
);

CREATE INDEX IF NOT EXISTS horarios_especiais_periodo_idx
  ON public.horarios_especiais (tenant_id, dia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_especiais TO authenticated;

GRANT ALL ON public.horarios_especiais TO service_role;

ALTER TABLE public.horarios_especiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membros leem horarios especiais" ON public.horarios_especiais;

CREATE POLICY "membros leem horarios especiais"
  ON public.horarios_especiais FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "membros criam horarios especiais" ON public.horarios_especiais;

CREATE POLICY "membros criam horarios especiais"
  ON public.horarios_especiais FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia')
    AND (
      profissional_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profissionais p
        WHERE p.id = horarios_especiais.profissional_id AND p.tenant_id = horarios_especiais.tenant_id
      )
    )
  );

DROP POLICY IF EXISTS "membros atualizam horarios especiais" ON public.horarios_especiais;

CREATE POLICY "membros atualizam horarios especiais"
  ON public.horarios_especiais FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'))
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia')
    AND (
      profissional_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profissionais p
        WHERE p.id = horarios_especiais.profissional_id AND p.tenant_id = horarios_especiais.tenant_id
      )
    )
  );

DROP POLICY IF EXISTS "membros removem horarios especiais" ON public.horarios_especiais;

CREATE POLICY "membros removem horarios especiais"
  ON public.horarios_especiais FOR DELETE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));


CREATE OR REPLACE FUNCTION public.criar_agendamento(_tenant_id uuid, _cliente_id uuid, _profissional_id uuid, _servico_id uuid, _inicio timestamp with time zone, _forma_pagamento text, _encaixe boolean DEFAULT false, _validar_regras boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_servico public.servicos%ROWTYPE;
  v_cliente public.clientes%ROWTYPE;
  v_carteira public.carteiras%ROWTYPE;
  v_regra public.regras_de_plano%ROWTYPE;
  v_fim timestamptz;
  v_ag_id uuid;
  v_disponivel int;
  v_valor int;
  v_servidor boolean := public.chamada_do_servidor();
  v_fuso text; v_folga int; v_janela int;
  v_local timestamp; v_dur interval; v_ok boolean := false;
  v_h record; v_base timestamp; v_abre timestamp; v_fecha timestamp; v_pi timestamp; v_pf timestamp;
  v_especial record;
  v_especial_proprio boolean := false;
  v_escala record;
BEGIN
  IF NOT v_servidor AND (auth.uid() IS NULL OR NOT public.permissao_efetiva(auth.uid(), _tenant_id, 'criar_agendamento')) THEN
    RAISE EXCEPTION 'sem permissao para agendar nesta barbearia';
  END IF;
  IF _forma_pagamento NOT IN ('credito','pix','balcao','fiado','saldo') THEN
    RAISE EXCEPTION 'forma de pagamento invalida';
  END IF;
  IF _encaixe AND NOT v_servidor AND NOT public.is_tenant_member(_tenant_id) THEN
    RAISE EXCEPTION 'encaixe so pelo painel';
  END IF;

  SELECT * INTO v_servico FROM public.servicos WHERE id = _servico_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'servico nao encontrado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profissionais WHERE id = _profissional_id AND tenant_id = _tenant_id) THEN
    RAISE EXCEPTION 'profissional nao encontrado';
  END IF;
  -- Agendamento de balcão sem cliente continua valendo (0039).
  IF _cliente_id IS NOT NULL THEN
    SELECT * INTO v_cliente FROM public.clientes WHERE id = _cliente_id AND tenant_id = _tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'cliente nao encontrado'; END IF;
  ELSIF _forma_pagamento <> 'balcao' THEN
    RAISE EXCEPTION 'cliente obrigatorio para esta forma de pagamento';
  END IF;

  v_fim := _inicio + make_interval(mins => v_servico.duracao_min);
  v_dur := make_interval(mins => v_servico.duracao_min);

  -- Serializa gravações do mesmo profissional: folga e horário são conferidos sem corrida.
  PERFORM pg_advisory_xact_lock(hashtextextended('agenda:' || _profissional_id::text, 0));

  IF _validar_regras AND NOT _encaixe THEN
    SELECT coalesce(fuso, 'America/Sao_Paulo'), greatest(coalesce(intervalo_entre_min, 0), 0), coalesce(janela_agendamento_dias, 30)
      INTO v_fuso, v_folga, v_janela FROM public.tenants WHERE id = _tenant_id;
    IF _inicio > now() + make_interval(days => v_janela) THEN
      RAISE EXCEPTION 'fora do periodo de agendamento';
    END IF;
    v_local := _inicio AT TIME ZONE v_fuso;

    -- O especial do profissional prevalece; sem ele, usa-se o especial do negócio;
    -- sem nenhum dos dois, mantém-se exatamente a regra semanal (inclusive virada de dia).
    SELECT abre, fecha INTO v_especial
      FROM public.horarios_especiais
      WHERE tenant_id = _tenant_id
        AND dia = v_local::date
        AND profissional_id = _profissional_id;
    IF FOUND THEN
      v_especial_proprio := true;
    ELSE
      SELECT abre, fecha INTO v_especial
        FROM public.horarios_especiais
        WHERE tenant_id = _tenant_id
          AND dia = v_local::date
          AND profissional_id IS NULL;
    END IF;

    IF v_especial.abre IS NOT NULL THEN
      v_base := date_trunc('day', v_local);
      v_abre := v_base + v_especial.abre;
      v_fecha := v_base + v_especial.fecha;
      -- Quando a exceção é do negócio, a escala individual continua valendo.
      -- Só o especial próprio substitui a escala do profissional nesta data.
      IF NOT v_especial_proprio THEN
        SELECT trabalha, abre, fecha INTO v_escala
          FROM public.escalas_de_profissional
          WHERE tenant_id = _tenant_id
            AND profissional_id = _profissional_id
            AND dia_semana = extract(dow FROM v_local)::int
          LIMIT 1;
        IF FOUND THEN
          IF v_escala.trabalha IS DISTINCT FROM true
            OR v_escala.abre IS NULL OR v_escala.fecha IS NULL THEN
            RAISE EXCEPTION 'fora do horario de funcionamento';
          END IF;
          v_pi := v_base + v_escala.abre;
          v_pf := v_base + v_escala.fecha
            + CASE WHEN v_escala.fecha <= v_escala.abre THEN interval '1 day' ELSE interval '0' END;
          IF v_local < v_pi OR v_local + v_dur > v_pf THEN
            RAISE EXCEPTION 'fora do horario de funcionamento';
          END IF;
        END IF;
      END IF;
      IF v_local >= v_abre AND v_local + v_dur <= v_fecha THEN
        -- A pausa semanal continua valendo na data especial, se estiver configurada.
        SELECT * INTO v_h
          FROM public.horarios_de_funcionamento
          WHERE tenant_id = _tenant_id
            AND dia_semana = extract(dow FROM v_local)::int
            AND NOT fechado
          LIMIT 1;
        IF FOUND AND v_h.intervalo_inicio IS NOT NULL AND v_h.intervalo_fim IS NOT NULL THEN
          v_pi := v_base + v_h.intervalo_inicio
            + CASE WHEN v_h.intervalo_inicio < v_h.abre THEN interval '1 day' ELSE interval '0' END;
          v_pf := v_base + v_h.intervalo_fim
            + CASE WHEN v_h.intervalo_fim < v_h.abre THEN interval '1 day' ELSE interval '0' END;
          IF v_local < v_pf AND v_local + v_dur > v_pi THEN
            RAISE EXCEPTION 'fora do horario de funcionamento';
          END IF;
        END IF;
        v_ok := true;
      END IF;
    ELSE
      FOR v_h IN
        SELECT h.*, (h.dia_semana <> extract(dow FROM v_local)::int) AS ontem
        FROM public.horarios_de_funcionamento h
        WHERE h.tenant_id = _tenant_id AND NOT h.fechado
          AND h.dia_semana IN (extract(dow FROM v_local)::int, extract(dow FROM v_local - interval '1 day')::int)
      LOOP
        v_base := date_trunc('day', v_local) - CASE WHEN v_h.ontem THEN interval '1 day' ELSE interval '0' END;
        v_abre := v_base + v_h.abre;
        v_fecha := v_base + v_h.fecha + CASE WHEN v_h.fecha <= v_h.abre THEN interval '1 day' ELSE interval '0' END;
        IF v_local >= v_abre AND v_local + v_dur <= v_fecha THEN
          IF v_h.intervalo_inicio IS NOT NULL AND v_h.intervalo_fim IS NOT NULL THEN
            v_pi := v_base + v_h.intervalo_inicio + CASE WHEN v_h.intervalo_inicio < v_h.abre THEN interval '1 day' ELSE interval '0' END;
            v_pf := v_base + v_h.intervalo_fim + CASE WHEN v_h.intervalo_fim < v_h.abre THEN interval '1 day' ELSE interval '0' END;
            IF v_local < v_pf AND v_local + v_dur > v_pi THEN CONTINUE; END IF;
          END IF;
          v_ok := true;
          EXIT;
        END IF;
      END LOOP;
    END IF;
    IF NOT v_ok THEN RAISE EXCEPTION 'fora do horario de funcionamento'; END IF;

    IF EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.profissional_id = _profissional_id
        AND a.status IN ('agendado','pendente','confirmado','chegou','na_cadeira')
        AND NOT a.encaixe
        AND a.inicio < v_fim + make_interval(mins => v_folga)
        AND a.fim > _inicio - make_interval(mins => v_folga)
    ) THEN
      RAISE EXCEPTION 'horario ja ocupado';
    END IF;
  END IF;

  IF NOT _encaixe AND EXISTS (
    SELECT 1 FROM public.agendamentos a
    WHERE a.profissional_id = _profissional_id
      AND a.status IN ('agendado','pendente','confirmado','chegou','na_cadeira')
      AND NOT a.encaixe
      AND a.inicio < v_fim AND a.fim > _inicio
  ) THEN
    RAISE EXCEPTION 'horario ja ocupado';
  END IF;

  IF _cliente_id IS NOT NULL THEN
    SELECT * INTO v_carteira FROM public.carteiras WHERE cliente_id = _cliente_id AND tenant_id = _tenant_id FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.carteiras (tenant_id, cliente_id) VALUES (_tenant_id, _cliente_id) RETURNING * INTO v_carteira;
    END IF;

    IF _forma_pagamento = 'credito' THEN
      IF v_carteira.saldo_creditos < 1 THEN RAISE EXCEPTION 'sem creditos disponiveis'; END IF;
    ELSIF _forma_pagamento = 'saldo' THEN
      IF v_carteira.saldo_centavos < v_servico.preco_centavos THEN RAISE EXCEPTION 'saldo insuficiente na carteira'; END IF;
    ELSIF _forma_pagamento = 'fiado' THEN
      SELECT * INTO v_regra FROM public.regras_de_plano WHERE tenant_id = _tenant_id AND tipo = 'fiado' AND ativo LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'fiado nao disponivel'; END IF;
      v_disponivel := v_cliente.limite_fiado_centavos + LEAST(v_carteira.saldo_centavos, 0);
      IF v_servico.preco_centavos > v_disponivel AND v_regra.bloqueia_agendamento_no_limite THEN
        RAISE EXCEPTION 'limite de fiado atingido';
      END IF;
    END IF;
  END IF;

  v_valor := CASE WHEN _forma_pagamento = 'credito' THEN 0 ELSE v_servico.preco_centavos END;

  BEGIN
    INSERT INTO public.agendamentos (tenant_id, cliente_id, profissional_id, servico_id, inicio, fim, status, forma_pagamento, valor_centavos, encaixe, pagamento_confirmado_em)
    VALUES (_tenant_id, _cliente_id, _profissional_id, _servico_id, _inicio, v_fim, 'agendado', _forma_pagamento,
            v_valor, _encaixe, CASE WHEN _forma_pagamento = 'saldo' THEN now() ELSE NULL END)
    RETURNING id INTO v_ag_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'horario ja ocupado';
  END;

  IF _forma_pagamento = 'credito' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, creditos_delta, origem, agendamento_id, descricao, criado_por)
    VALUES (v_carteira.id, 'debito', -1, 'mensal', v_ag_id, 'Uso de 1 credito em ' || v_servico.nome, auth.uid());
  ELSIF _forma_pagamento = 'saldo' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, centavos_delta, origem, agendamento_id, descricao, criado_por)
    VALUES (v_carteira.id, 'debito', -v_servico.preco_centavos, 'avulso', v_ag_id, 'Pagamento com saldo: ' || v_servico.nome, auth.uid());
    PERFORM public.criar_notificacao(_tenant_id, 'pagamento', 'Pagamento recebido',
      coalesce(v_cliente.nome, 'Cliente') || ' pagou ' || to_char(v_servico.preco_centavos / 100.0, 'FM999G999D00') || ' com saldo da carteira',
      '/barbeiro/agenda');
  ELSIF _forma_pagamento = 'pix' THEN
    PERFORM public.criar_notificacao(_tenant_id, 'pix', 'Pix a confirmar',
      coalesce(v_cliente.nome, 'Cliente') || ' vai pagar ' || to_char(v_servico.preco_centavos / 100.0, 'FM999G999D00') || ' por Pix',
      '/barbeiro/agenda');
  ELSIF _forma_pagamento = 'fiado' THEN
    INSERT INTO public.movimentos (carteira_id, tipo, centavos_delta, origem, agendamento_id, descricao, criado_por)
    VALUES (v_carteira.id, 'fiado', -v_servico.preco_centavos, 'fiado', v_ag_id, 'Fiado: ' || v_servico.nome, auth.uid());
  END IF;

  SELECT * INTO v_carteira FROM public.carteiras WHERE id = v_carteira.id;

  RETURN jsonb_build_object(
    'agendamento_id', v_ag_id, 'inicio', _inicio, 'fim', v_fim,
    'forma_pagamento', _forma_pagamento, 'valor_centavos', v_valor,
    'saldo_creditos', v_carteira.saldo_creditos, 'saldo_centavos', v_carteira.saldo_centavos,
    'fidelidade_progresso', v_carteira.fidelidade_progresso,
    'fidelidade_alvo', (SELECT fidelidade_alvo FROM public.regras_de_plano WHERE tenant_id = _tenant_id AND tipo = 'fidelidade' AND ativo LIMIT 1)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_agendamento(uuid, uuid, uuid, uuid, timestamptz, text, boolean, boolean) TO authenticated, service_role;;
create schema if not exists cortai_controle;
revoke all on schema cortai_controle from public, anon, authenticated;
create table if not exists cortai_controle.migracoes_aplicadas (arquivo text primary key, aplicada_em timestamptz not null default now());
insert into cortai_controle.migracoes_aplicadas (arquivo) values
  ('0044_identidade_cloud.sql'), ('0045_intervalo_personalizado.sql'), ('0046_pacotes_e_combos.sql'), ('0049_categorias_servicos.sql'),
  ('0050_intervalos_agenda_dia.sql'), ('0051_marca_flow_textos.sql'), ('0052_plano_flow_chat.sql'), ('0053_textos_flow_recursos_modelos.sql'),
  ('0054_horarios_especiais.sql') on conflict do nothing;
commit;
