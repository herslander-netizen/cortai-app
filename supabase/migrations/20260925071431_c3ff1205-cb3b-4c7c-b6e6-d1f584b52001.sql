-- 1) Barbearia decide se o barbeiro pode receber pagamento
ALTER TABLE public.configuracoes_financeiras ADD COLUMN IF NOT EXISTS barbeiro_recebe boolean NOT NULL DEFAULT false;

-- 2) Teto de cada função: o ajuste fino nunca passa daqui
CREATE OR REPLACE FUNCTION public.teto_do_papel(_papel text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT CASE _papel
 WHEN 'dono' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia','gerenciar_permissoes','acoes_destrutivas','gerenciar_voltai','ver_cortai','gerenciar_conversas','assumir_conversa','configurar_automacoes','gerenciar_whatsapp','conceder_desconto','caixa_abrir_fechar','caixa_movimentar','estorno_autorizar','comissao_configurar','comissao_pagar','comissao_visualizar_todas','caixa_do_dia','gerenciar_plano','liberar_fiado','excluir_barbearia']::text[]
 WHEN 'gerente' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia','gerenciar_permissoes','acoes_destrutivas','gerenciar_voltai','ver_cortai','gerenciar_conversas','assumir_conversa','configurar_automacoes','gerenciar_whatsapp','conceder_desconto','caixa_abrir_fechar','caixa_movimentar','estorno_autorizar','comissao_configurar','comissao_pagar','comissao_visualizar_todas','caixa_do_dia']::text[]
 WHEN 'recepcao' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes','ver_cortai','gerenciar_conversas','assumir_conversa','conceder_desconto','caixa_abrir_fechar','caixa_movimentar','caixa_do_dia']::text[]
 WHEN 'barbeiro' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes','ver_cortai','assumir_conversa','conceder_desconto']::text[]
 ELSE '{}'::text[] END
$$;

CREATE OR REPLACE FUNCTION public.permissoes_padrao(_papel text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT CASE _papel
 WHEN 'dono' THEN public.teto_do_papel('dono')
 WHEN 'gerente' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia','gerenciar_permissoes','gerenciar_voltai','ver_cortai','gerenciar_conversas','assumir_conversa','configurar_automacoes','gerenciar_whatsapp','conceder_desconto','caixa_abrir_fechar','caixa_movimentar','comissao_visualizar_todas','caixa_do_dia']::text[]
 WHEN 'recepcao' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes','caixa_do_dia']::text[]
 WHEN 'barbeiro' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes']::text[]
 ELSE '{}'::text[] END
$$;

-- 3) Regra única de permissão efetiva
CREATE OR REPLACE FUNCTION public.permissao_efetiva(_user uuid, _tenant uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_usuarios tu
    WHERE tu.tenant_id = _tenant AND tu.user_id = _user AND tu.ativo
      AND (
        tu.papel = 'dono'
        OR (
          _perm = ANY(tu.permissoes)
          AND _perm = ANY(public.teto_do_papel(tu.papel))
          AND NOT (
            tu.papel = 'barbeiro' AND _perm = 'confirmar_pagamento'
            AND NOT COALESCE((SELECT cf.barbeiro_recebe FROM public.configuracoes_financeiras cf WHERE cf.tenant_id = _tenant), false)
          )
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION public.permissao_efetiva(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.permissao_efetiva(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.has_tenant_permission(_tenant_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.permissao_efetiva(auth.uid(), _tenant_id, _permission)
$$;

CREATE OR REPLACE FUNCTION public.financeiro_tem_permissao(_ator uuid, _tenant uuid, _permissao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.permissao_efetiva(_ator, _tenant, _permissao)
$$;

-- 4) Permissões gravadas nunca passam do teto da função
CREATE OR REPLACE FUNCTION public.tenant_usuarios_limitar_permissoes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.permissoes := ARRAY(SELECT p FROM unnest(COALESCE(NEW.permissoes, '{}'::text[])) p WHERE p = ANY(public.teto_do_papel(NEW.papel)));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tenant_usuarios_limitar_permissoes() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tenant_usuarios_limitar_permissoes ON public.tenant_usuarios;
CREATE TRIGGER tenant_usuarios_limitar_permissoes BEFORE INSERT OR UPDATE OF permissoes, papel ON public.tenant_usuarios
FOR EACH ROW EXECUTE FUNCTION public.tenant_usuarios_limitar_permissoes();

-- Aplica às contas atuais: gerente ganha equipe; recepção e gerente ganham o caixa do dia
UPDATE public.tenant_usuarios SET permissoes = permissoes || ARRAY['gerenciar_permissoes','caixa_do_dia']
 WHERE papel = 'gerente' AND NOT ('caixa_do_dia' = ANY(permissoes));
UPDATE public.tenant_usuarios SET permissoes = permissoes || ARRAY['caixa_do_dia']
 WHERE papel = 'recepcao' AND NOT ('caixa_do_dia' = ANY(permissoes));
UPDATE public.tenant_usuarios SET permissoes = permissoes WHERE papel IN ('barbeiro','recepcao','gerente');

-- 5) Hoje no fuso da barbearia
CREATE OR REPLACE FUNCTION public.eh_hoje_na_barbearia(_tenant uuid, _em timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_em AT TIME ZONE COALESCE(t.fuso, 'America/Sao_Paulo'))::date = (now() AT TIME ZONE COALESCE(t.fuso, 'America/Sao_Paulo'))::date
  FROM public.tenants t WHERE t.id = _tenant
$$;
REVOKE ALL ON FUNCTION public.eh_hoje_na_barbearia(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_hoje_na_barbearia(uuid, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.eh_meu_profissional(_profissional_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _profissional_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profissionais p WHERE p.id = _profissional_id AND p.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.eh_meu_profissional(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_meu_profissional(uuid) TO authenticated, service_role;

-- 6) Financeiro: cada função vê só o que deve
DROP POLICY IF EXISTS "membros veem movimentos do caixa" ON public.caixa_movimentos;
CREATE POLICY "financeiro por funcao ve movimentos" ON public.caixa_movimentos FOR SELECT TO authenticated
USING (
  public.has_tenant_permission(tenant_id, 'visualizar_financeiro')
  OR (public.has_tenant_permission(tenant_id, 'caixa_do_dia') AND public.eh_hoje_na_barbearia(tenant_id, criado_em))
  OR (public.is_tenant_member(tenant_id) AND public.eh_meu_profissional(profissional_id))
);

DROP POLICY IF EXISTS "membros veem sessoes do caixa" ON public.caixa_sessoes;
CREATE POLICY "financeiro por funcao ve sessoes" ON public.caixa_sessoes FOR SELECT TO authenticated
USING (
  public.has_tenant_permission(tenant_id, 'visualizar_financeiro')
  OR (public.has_tenant_permission(tenant_id, 'caixa_do_dia') AND public.eh_hoje_na_barbearia(tenant_id, aberto_em))
);

DROP POLICY IF EXISTS "membros veem comandas" ON public.comandas;
CREATE POLICY "comandas por funcao" ON public.comandas FOR SELECT TO authenticated
USING (
  public.has_tenant_permission(tenant_id, 'visualizar_financeiro')
  OR public.has_tenant_permission(tenant_id, 'confirmar_pagamento')
  OR public.has_tenant_permission(tenant_id, 'caixa_do_dia')
  OR (public.is_tenant_member(tenant_id) AND public.eh_meu_profissional(profissional_id))
);

DROP POLICY IF EXISTS "membros veem pagamentos" ON public.pagamentos;
CREATE POLICY "pagamentos por funcao" ON public.pagamentos FOR SELECT TO authenticated
USING (
  public.has_tenant_permission(tenant_id, 'visualizar_financeiro')
  OR (public.has_tenant_permission(tenant_id, 'caixa_do_dia') AND public.eh_hoje_na_barbearia(tenant_id, criado_em))
  OR (public.is_tenant_member(tenant_id) AND criado_por = auth.uid())
);

DROP POLICY IF EXISTS "tenant gerencia vendas" ON public.vendas;
CREATE POLICY "vendas por funcao" ON public.vendas FOR SELECT TO authenticated
USING (
  public.has_tenant_permission(tenant_id, 'visualizar_financeiro')
  OR (public.has_tenant_permission(tenant_id, 'caixa_do_dia') AND public.eh_hoje_na_barbearia(tenant_id, criado_em))
  OR (public.is_tenant_member(tenant_id) AND criado_por = auth.uid())
);
CREATE POLICY "quem vende registra venda" ON public.vendas FOR INSERT TO authenticated
WITH CHECK (public.has_tenant_permission(tenant_id, 'registrar_venda') AND (criado_por IS NULL OR criado_por = auth.uid()));
CREATE POLICY "financeiro ajusta vendas" ON public.vendas FOR UPDATE TO authenticated
USING (public.has_tenant_permission(tenant_id, 'visualizar_financeiro'))
WITH CHECK (public.has_tenant_permission(tenant_id, 'visualizar_financeiro'));
CREATE POLICY "exclusao de vendas" ON public.vendas FOR DELETE TO authenticated
USING (public.has_tenant_permission(tenant_id, 'acoes_destrutivas'));

-- 7) Configurações (regras de plano do cliente): gerente e dono
DROP POLICY IF EXISTS "tenant gerencia regras" ON public.regras_de_plano;
CREATE POLICY "membros leem regras" ON public.regras_de_plano FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "gestao altera regras" ON public.regras_de_plano FOR ALL TO authenticated
USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'))
WITH CHECK (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));

-- 8) Liberação de fiado: só dono
CREATE OR REPLACE FUNCTION public.clientes_proteger_limite_fiado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.limite_fiado_centavos, 0) > 0 AND NOT public.has_tenant_permission(NEW.tenant_id, 'liberar_fiado') THEN
      RAISE EXCEPTION 'Só o dono da barbearia libera fiado.' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.limite_fiado_centavos IS DISTINCT FROM OLD.limite_fiado_centavos
        AND NOT public.has_tenant_permission(NEW.tenant_id, 'liberar_fiado') THEN
    RAISE EXCEPTION 'Só o dono da barbearia libera fiado.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.clientes_proteger_limite_fiado() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS clientes_proteger_limite_fiado ON public.clientes;
CREATE TRIGGER clientes_proteger_limite_fiado BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.clientes_proteger_limite_fiado();

-- 9) Liga/desliga "barbeiro recebe": gerente ou dono
CREATE OR REPLACE FUNCTION public.definir_barbeiro_recebe(_tenant uuid, _valor boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_tenant_permission(_tenant, 'gerenciar_permissoes') THEN
    RAISE EXCEPTION 'sem permissao' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.configuracoes_financeiras (tenant_id, barbeiro_recebe) VALUES (_tenant, _valor)
  ON CONFLICT (tenant_id) DO UPDATE SET barbeiro_recebe = EXCLUDED.barbeiro_recebe;
  PERFORM public.registrar_auditoria_barbearia(_tenant, 'permissoes.barbeiro_recebe', NULL, jsonb_build_object('valor', _valor));
END $$;
REVOKE ALL ON FUNCTION public.definir_barbeiro_recebe(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_barbeiro_recebe(uuid, boolean) TO authenticated, service_role;