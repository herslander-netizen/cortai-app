-- Equipe só escreve com a permissão do papel (achados 2, 3 e 6 da auditoria de 09/10/2026).
-- Antes, várias tabelas aceitavam escrita direta de QUALQUER membro ativo (só is_tenant_member).
-- Nada é apagado: só políticas e um gatilho de proteção. As funções do servidor (service_role)
-- e as RPCs SECURITY DEFINER continuam funcionando como antes.

-- Alguma das permissões no negócio (admin da plataforma sempre pode, como em is_tenant_member).
CREATE OR REPLACE FUNCTION public.tem_alguma_permissao(_tenant_id uuid, _permissoes text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM unnest(_permissoes) p WHERE public.permissao_efetiva(auth.uid(), _tenant_id, p))
$fn$;
REVOKE ALL ON FUNCTION public.tem_alguma_permissao(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tem_alguma_permissao(uuid, text[]) TO authenticated;

-- 1) movimentos: créditos, fiado e fidelidade só pelo servidor e pelas RPCs oficiais.
-- Nenhuma tela grava direto; sem esta política o INSERT direto da equipe é recusado.
DROP POLICY IF EXISTS "tenant lanca movimentos" ON public.movimentos;

-- 2) agendamentos: situação, valor e pagamento só mudam pelas funções oficiais.
-- Chamada direta pela API roda como authenticated/anon; RPC SECURITY DEFINER e servidor não.
CREATE OR REPLACE FUNCTION public.agendamento_proteger_colunas_sensiveis()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $fn$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.pagamento_confirmado_em IS NOT NULL OR NEW.pagamento_confirmado_por IS NOT NULL THEN
      RAISE EXCEPTION 'pagamento só é confirmado pelas funções oficiais';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.pagamento_confirmado_em IS DISTINCT FROM OLD.pagamento_confirmado_em
     OR NEW.pagamento_confirmado_por IS DISTINCT FROM OLD.pagamento_confirmado_por
     OR NEW.valor_centavos IS DISTINCT FROM OLD.valor_centavos THEN
    RAISE EXCEPTION 'situação, valor e pagamento do agendamento só mudam pelas funções oficiais';
  END IF;
  RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS trg_agendamento_proteger_colunas_sensiveis ON public.agendamentos;
CREATE TRIGGER trg_agendamento_proteger_colunas_sensiveis
  BEFORE INSERT OR UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_proteger_colunas_sensiveis();

-- 3) servicos: leitura da equipe igual; escrita com alterar_dados_barbearia (preço também com alterar_preco).
DROP POLICY IF EXISTS "tenant gerencia servicos" ON public.servicos;
CREATE POLICY "equipe le servicos" ON public.servicos
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria servicos" ON public.servicos
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera servicos" ON public.servicos
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia', 'alterar_preco']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia', 'alterar_preco']));
CREATE POLICY "equipe com permissao remove servicos" ON public.servicos
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));

-- 4) profissionais: escrita com gerenciar_profissionais ou alterar_dados_barbearia.
DROP POLICY IF EXISTS "tenant gerencia profissionais" ON public.profissionais;
CREATE POLICY "equipe le profissionais" ON public.profissionais
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria profissionais" ON public.profissionais
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['gerenciar_profissionais', 'alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera profissionais" ON public.profissionais
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['gerenciar_profissionais', 'alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['gerenciar_profissionais', 'alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove profissionais" ON public.profissionais
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['gerenciar_profissionais', 'alterar_dados_barbearia']));

-- 5) horarios_de_funcionamento: escrita com alterar_dados_barbearia (leitura pública segue igual).
DROP POLICY IF EXISTS "equipe altera horarios" ON public.horarios_de_funcionamento;
CREATE POLICY "equipe com permissao cria horarios" ON public.horarios_de_funcionamento
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera horarios" ON public.horarios_de_funcionamento
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove horarios" ON public.horarios_de_funcionamento
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));

-- 6) produtos: cadastro, preço e estoque com alterar_estoque. A venda baixa o estoque pela
-- própria função, que passa a rodar como SECURITY DEFINER e confere registrar_venda
-- (antes era SECURITY INVOKER e dependia de qualquer membro poder alterar produtos).
CREATE OR REPLACE FUNCTION public.registrar_venda_produto(_produto_id uuid, _quantidade integer, _forma_pagamento text DEFAULT 'balcao'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  p public.produtos%ROWTYPE;
  v_id uuid;
  total integer;
BEGIN
  IF _quantidade <= 0 THEN RAISE EXCEPTION 'quantidade invalida'; END IF;
  SELECT * INTO p FROM public.produtos WHERE id = _produto_id FOR UPDATE;
  IF p.id IS NULL OR NOT public.is_tenant_member(p.tenant_id) THEN RAISE EXCEPTION 'produto nao encontrado'; END IF;
  IF NOT public.tem_alguma_permissao(p.tenant_id, ARRAY['registrar_venda']) THEN RAISE EXCEPTION 'sem permissao para registrar venda'; END IF;
  IF NOT p.ativo THEN RAISE EXCEPTION 'produto inativo'; END IF;
  IF p.quantidade < _quantidade THEN RAISE EXCEPTION 'estoque insuficiente'; END IF;
  total := p.preco_centavos * _quantidade;
  INSERT INTO public.vendas (tenant_id, categoria, descricao, total_centavos, forma_pagamento, criado_por)
  VALUES (p.tenant_id, 'produtos', p.nome, total, _forma_pagamento, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO public.venda_itens (venda_id, produto_id, nome, quantidade, preco_unitario_centavos, custo_unitario_centavos)
  VALUES (v_id, p.id, p.nome, _quantidade, p.preco_centavos, p.custo_centavos);
  UPDATE public.produtos SET quantidade = quantidade - _quantidade WHERE id = p.id;
  RETURN jsonb_build_object('venda_id', v_id, 'total_centavos', total, 'estoque_restante', p.quantidade - _quantidade);
END;
$fn$;
REVOKE ALL ON FUNCTION public.registrar_venda_produto(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venda_produto(uuid, integer, text) TO authenticated;

DROP POLICY IF EXISTS "tenant cria produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant atualiza produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant remove produtos" ON public.produtos;
CREATE POLICY "equipe com permissao cria produtos" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_estoque', 'alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera produtos" ON public.produtos
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_estoque', 'alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_estoque', 'alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove produtos" ON public.produtos
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_estoque', 'alterar_dados_barbearia']));

-- 7) avaliacoes: a equipe só lê; a gravação é da RPC pública atômica e do servidor.
DROP POLICY IF EXISTS "equipe da barbearia gerencia avaliacoes" ON public.avaliacoes;
CREATE POLICY "equipe le avaliacoes" ON public.avaliacoes
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
