ALTER TABLE public.tenant_usuarios ADD COLUMN IF NOT EXISTS aceito_em timestamptz;
UPDATE public.tenant_usuarios SET aceito_em = COALESCE(aceito_em, criado_em) WHERE aceito_em IS NULL;

CREATE OR REPLACE FUNCTION public.permissoes_padrao(_papel text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $function$
  SELECT CASE _papel
    WHEN 'dono' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia','gerenciar_permissoes','acoes_destrutivas','gerenciar_voltai']::text[]
    WHEN 'gerente' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','alterar_preco','visualizar_estoque','alterar_estoque','visualizar_clientes','editar_clientes','visualizar_financeiro','relatorios','gerenciar_profissionais','alterar_dados_barbearia','gerenciar_voltai']::text[]
    WHEN 'barbeiro' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes']::text[]
    WHEN 'recepcao' THEN ARRAY['criar_agendamento','agendamento_manual','cancelar_agendamento','confirmar_pagamento','registrar_venda','visualizar_estoque','visualizar_clientes','editar_clientes']::text[]
    ELSE '{}'::text[]
  END
$function$;

DROP FUNCTION IF EXISTS public.equipe_do_tenant(uuid);
CREATE FUNCTION public.equipe_do_tenant(_tenant_id uuid)
RETURNS TABLE(user_id uuid, email text, nome text, papel text, permissoes text[], ativo boolean, criado_em timestamptz, aceito_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_tenant_permission(_tenant_id, 'gerenciar_permissoes') THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
  RETURN QUERY
    SELECT tu.user_id,
           u.email::text,
           p.nome,
           tu.papel,
           CASE WHEN tu.papel = 'dono' THEN public.permissoes_padrao('dono') ELSE tu.permissoes END,
           tu.ativo,
           tu.criado_em,
           tu.aceito_em
    FROM public.tenant_usuarios tu
    LEFT JOIN auth.users u ON u.id = tu.user_id
    LEFT JOIN public.perfis p ON p.user_id = tu.user_id
    WHERE tu.tenant_id = _tenant_id
    ORDER BY (tu.papel = 'dono') DESC, tu.criado_em;
END;
$$;

CREATE OR REPLACE FUNCTION public.meu_convite()
RETURNS TABLE(tenant_id uuid, barbearia text, papel text, permissoes text[], ativo boolean, aceito_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT tu.tenant_id,
         t.nome,
         tu.papel,
         CASE WHEN tu.papel = 'dono' THEN public.permissoes_padrao('dono') ELSE tu.permissoes END,
         tu.ativo,
         tu.aceito_em
  FROM public.tenant_usuarios tu
  JOIN public.tenants t ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.confirmar_meu_acesso()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _tenant uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sem sessao'; END IF;
  UPDATE public.tenant_usuarios
     SET aceito_em = COALESCE(aceito_em, now()), atualizado_em = now()
   WHERE user_id = auth.uid()
  RETURNING tenant_id INTO _tenant;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'membro nao encontrado'; END IF;
  PERFORM public.registrar_auditoria_barbearia(_tenant, 'equipe.acesso_confirmado', auth.uid()::text, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.equipe_do_tenant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.meu_convite() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirmar_meu_acesso() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipe_do_tenant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.meu_convite() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirmar_meu_acesso() TO authenticated, service_role;