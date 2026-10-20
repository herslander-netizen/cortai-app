-- Achados N6 e C6 (auditoria de 16/10). Só troca o corpo de duas funções; nenhuma linha muda.
--
-- N6: convidar_membro procurava o e-mail em auth.users e respondia "conta nao encontrada" antes de
-- conferir a permissão de quem chamou. Qualquer pessoa logada descobria se um e-mail tinha conta
-- (e o servidor ainda disparava o convite por e-mail nesse caso). Agora a permissão
-- (gerenciar_permissoes no negócio) vem primeiro; o resto do corpo é o mesmo de 20260913144719.
CREATE OR REPLACE FUNCTION public.convidar_membro(_tenant_id uuid, _email text, _papel text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _alvo uuid;
  _perms text[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sem sessao'; END IF;
  IF NOT public.has_tenant_permission(_tenant_id, 'gerenciar_permissoes') THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
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
$$;--> statement-breakpoint
-- C6: has_role(_user_id, …) respondia para qualquer user_id. Uma pessoa logada perguntava pela
-- API se outra conta era admin ou suporte. Agora, com sessão de usuário, só responde sobre a
-- própria conta; o servidor (chave de serviço, sem usuário) e as funções internas continuam
-- perguntando sobre qualquer conta. As políticas já passam auth.uid().
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.uid() IS NULL OR _user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
