ALTER TABLE public.tenant_usuarios
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_usuarios_papel_check') THEN
    ALTER TABLE public.tenant_usuarios
      ADD CONSTRAINT tenant_usuarios_papel_check CHECK (papel IN ('dono','gerente','barbeiro','recepcao'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.tenant_usuarios
    WHERE tenant_id = _tenant_id AND user_id = auth.uid() AND ativo
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_permission(_tenant_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_usuarios tu
    WHERE tu.tenant_id = _tenant_id
      AND tu.user_id = auth.uid()
      AND tu.ativo
      AND (_permission = ANY(tu.permissoes) OR tu.papel = 'dono')
  )
$$;

-- Papel e permissões efetivas do usuário atual na barbearia
CREATE OR REPLACE FUNCTION public.meu_acesso_no_tenant(_tenant_id uuid)
RETURNS TABLE(papel text, permissoes text[], ativo boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT tu.papel,
         CASE WHEN tu.papel = 'dono' THEN public.permissoes_padrao('dono') ELSE tu.permissoes END,
         tu.ativo
  FROM public.tenant_usuarios tu
  WHERE tu.tenant_id = _tenant_id AND tu.user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.equipe_do_tenant(_tenant_id uuid)
RETURNS TABLE(user_id uuid, email text, nome text, papel text, permissoes text[], ativo boolean, criado_em timestamptz)
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
           tu.criado_em
    FROM public.tenant_usuarios tu
    LEFT JOIN auth.users u ON u.id = tu.user_id
    LEFT JOIN public.perfis p ON p.user_id = tu.user_id
    WHERE tu.tenant_id = _tenant_id
    ORDER BY (tu.papel = 'dono') DESC, tu.criado_em;
END;
$$;

-- Garante que quem edita tem permissão e nunca concede mais do que possui
CREATE OR REPLACE FUNCTION public.equipe_valida_edicao(_tenant_id uuid, _user_id uuid, _papel text, _permissoes text[])
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _eu uuid := auth.uid();
  _meu_papel text;
  _minhas text[];
  _final text[];
  _perm text;
BEGIN
  IF _eu IS NULL THEN RAISE EXCEPTION 'sem sessao'; END IF;
  IF NOT public.has_tenant_permission(_tenant_id, 'gerenciar_permissoes') THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
  SELECT tu.papel INTO _meu_papel FROM public.tenant_usuarios tu
    WHERE tu.tenant_id = _tenant_id AND tu.user_id = _eu;
  IF _papel = 'dono' AND _meu_papel <> 'dono' THEN
    RAISE EXCEPTION 'somente o dono define outro dono';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenant_usuarios tu WHERE tu.tenant_id = _tenant_id AND tu.user_id = _user_id AND tu.papel = 'dono')
     AND _meu_papel <> 'dono' THEN
    RAISE EXCEPTION 'somente o dono altera o dono';
  END IF;
  _minhas := CASE WHEN _meu_papel = 'dono' THEN public.permissoes_padrao('dono')
                  ELSE (SELECT tu.permissoes FROM public.tenant_usuarios tu WHERE tu.tenant_id = _tenant_id AND tu.user_id = _eu) END;
  _final := COALESCE(_permissoes, public.permissoes_padrao(_papel));
  FOREACH _perm IN ARRAY _final LOOP
    IF NOT (_perm = ANY(_minhas)) THEN
      RAISE EXCEPTION 'nao e possivel conceder uma permissao que voce nao tem';
    END IF;
  END LOOP;
  RETURN _final;
END;
$$;

CREATE OR REPLACE FUNCTION public.convidar_membro(_tenant_id uuid, _email text, _papel text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _alvo uuid;
  _perms text[];
BEGIN
  IF _papel NOT IN ('gerente','barbeiro','recepcao') THEN
    RAISE EXCEPTION 'papel invalido';
  END IF;
  SELECT id INTO _alvo FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _alvo IS NULL THEN
    RAISE EXCEPTION 'conta nao encontrada';
  END IF;
  _perms := public.equipe_valida_edicao(_tenant_id, _alvo, _papel, public.permissoes_padrao(_papel));
  IF EXISTS (SELECT 1 FROM public.tenant_usuarios WHERE user_id = _alvo) THEN
    RAISE EXCEPTION 'esta conta ja esta ligada a uma barbearia';
  END IF;
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes)
  VALUES (_tenant_id, _alvo, _papel, _perms);
  UPDATE public.perfis SET tipo = 'barbeiro' WHERE user_id = _alvo AND tipo <> 'barbeiro';
  PERFORM public.registrar_auditoria_barbearia(_tenant_id, 'equipe.convite', _alvo::text, jsonb_build_object('papel', _papel));
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.definir_acesso_membro(_tenant_id uuid, _user_id uuid, _papel text, _permissoes text[], _ativo boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _perms text[];
BEGIN
  IF _papel NOT IN ('dono','gerente','barbeiro','recepcao') THEN
    RAISE EXCEPTION 'papel invalido';
  END IF;
  IF _user_id = auth.uid() AND _ativo = false THEN
    RAISE EXCEPTION 'voce nao pode desativar o proprio acesso';
  END IF;
  _perms := public.equipe_valida_edicao(_tenant_id, _user_id, _papel, _permissoes);
  UPDATE public.tenant_usuarios
     SET papel = _papel, permissoes = _perms, ativo = _ativo, atualizado_em = now()
   WHERE tenant_id = _tenant_id AND user_id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'membro nao encontrado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenant_usuarios WHERE tenant_id = _tenant_id AND papel = 'dono' AND ativo) THEN
    RAISE EXCEPTION 'a barbearia precisa de pelo menos um dono ativo';
  END IF;
  PERFORM public.registrar_auditoria_barbearia(_tenant_id, 'equipe.atualizacao', _user_id::text,
    jsonb_build_object('papel', _papel, 'ativo', _ativo, 'permissoes', to_jsonb(_perms)));
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.remover_membro(_tenant_id uuid, _user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'voce nao pode remover o proprio acesso';
  END IF;
  PERFORM public.equipe_valida_edicao(_tenant_id, _user_id, 'barbeiro', ARRAY[]::text[]);
  DELETE FROM public.tenant_usuarios WHERE tenant_id = _tenant_id AND user_id = _user_id;
  IF NOT EXISTS (SELECT 1 FROM public.tenant_usuarios WHERE tenant_id = _tenant_id AND papel = 'dono' AND ativo) THEN
    RAISE EXCEPTION 'a barbearia precisa de pelo menos um dono ativo';
  END IF;
  PERFORM public.registrar_auditoria_barbearia(_tenant_id, 'equipe.remocao', _user_id::text, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.equipe_valida_edicao(uuid, uuid, text, text[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meu_acesso_no_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equipe_do_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convidar_membro(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_acesso_membro(uuid, uuid, text, text[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_membro(uuid, uuid) TO authenticated;