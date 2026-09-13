-- 1. Horários de funcionamento
CREATE TABLE public.horarios_de_funcionamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  fechado boolean NOT NULL DEFAULT false,
  abre time NOT NULL DEFAULT '09:00',
  fecha time NOT NULL DEFAULT '19:00',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, dia_semana)
);
GRANT SELECT ON public.horarios_de_funcionamento TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_de_funcionamento TO authenticated;
GRANT ALL ON public.horarios_de_funcionamento TO service_role;
ALTER TABLE public.horarios_de_funcionamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "horarios visiveis publicamente" ON public.horarios_de_funcionamento FOR SELECT USING (true);
CREATE POLICY "equipe altera horarios" ON public.horarios_de_funcionamento FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

-- 2. Progresso da configuração inicial
CREATE TABLE public.onboarding_do_tenant (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  etapa text NOT NULL DEFAULT 'dados',
  itens jsonb NOT NULL DEFAULT '{}'::jsonb,
  tour_visto boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_do_tenant TO authenticated;
GRANT ALL ON public.onboarding_do_tenant TO service_role;
ALTER TABLE public.onboarding_do_tenant ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe cuida do onboarding" ON public.onboarding_do_tenant FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

-- 3. Conversas do assistente
CREATE TABLE public.conversas_de_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversas_de_ia TO authenticated;
GRANT ALL ON public.conversas_de_ia TO service_role;
ALTER TABLE public.conversas_de_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membro ve suas conversas" ON public.conversas_de_ia FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id) AND usuario_id = auth.uid())
  WITH CHECK (public.is_tenant_member(tenant_id) AND usuario_id = auth.uid());

CREATE TABLE public.mensagens_de_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.conversas_de_ia(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  autor text NOT NULL CHECK (autor IN ('barbeiro', 'assistente')),
  conteudo text NOT NULL,
  acao jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mensagens_de_ia_conversa_idx ON public.mensagens_de_ia (conversa_id, criado_em);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_de_ia TO authenticated;
GRANT ALL ON public.mensagens_de_ia TO service_role;
ALTER TABLE public.mensagens_de_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membro ve mensagens da sua conversa" ON public.mensagens_de_ia FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversas_de_ia c WHERE c.id = conversa_id AND c.usuario_id = auth.uid() AND public.is_tenant_member(c.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversas_de_ia c WHERE c.id = conversa_id AND c.usuario_id = auth.uid() AND public.is_tenant_member(c.tenant_id)));

-- 4. Fila pública
ALTER TABLE public.fila_de_espera
  ADD COLUMN servico_id uuid REFERENCES public.servicos(id) ON DELETE SET NULL,
  ADD COLUMN status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'avisado', 'atendido', 'saiu')),
  ADD COLUMN token_publico text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN origem text NOT NULL DEFAULT 'painel';

CREATE OR REPLACE FUNCTION public.entrar_na_fila_publica(
  _slug text, _nome text, _telefone text, _servico_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid;
  _cliente uuid;
  _fone text := regexp_replace(coalesce(_telefone, ''), '\D', '', 'g');
  _pos int;
  _token text;
  _existente record;
BEGIN
  IF length(coalesce(trim(_nome), '')) < 2 THEN RAISE EXCEPTION 'Informe seu nome.'; END IF;
  IF length(_fone) < 10 THEN RAISE EXCEPTION 'Informe um WhatsApp válido.'; END IF;

  SELECT id INTO _tenant FROM public.tenants WHERE slug = _slug AND ativo = true;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Barbearia não encontrada.'; END IF;

  IF _servico_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.servicos WHERE id = _servico_id AND tenant_id = _tenant AND ativo = true
  ) THEN RAISE EXCEPTION 'Serviço indisponível.'; END IF;

  SELECT id INTO _cliente FROM public.clientes
   WHERE tenant_id = _tenant AND regexp_replace(telefone, '\D', '', 'g') = _fone
   LIMIT 1;
  IF _cliente IS NULL THEN
    INSERT INTO public.clientes (tenant_id, nome, telefone, origem)
    VALUES (_tenant, trim(_nome), _fone, 'fila_publica')
    RETURNING id INTO _cliente;
  END IF;

  SELECT id, posicao, token_publico INTO _existente FROM public.fila_de_espera
   WHERE tenant_id = _tenant AND cliente_id = _cliente AND status IN ('aguardando', 'avisado')
   LIMIT 1;
  IF _existente.id IS NOT NULL THEN
    RETURN jsonb_build_object('token', _existente.token_publico, 'posicao', _existente.posicao);
  END IF;

  SELECT coalesce(max(posicao), 0) + 1 INTO _pos FROM public.fila_de_espera WHERE tenant_id = _tenant;
  _token := encode(gen_random_bytes(16), 'hex');
  INSERT INTO public.fila_de_espera (tenant_id, cliente_id, posicao, servico_id, token_publico, origem)
  VALUES (_tenant, _cliente, _pos, _servico_id, _token, 'link_publico');

  RETURN jsonb_build_object('token', _token, 'posicao', _pos);
END;
$$;
REVOKE ALL ON FUNCTION public.entrar_na_fila_publica(text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrar_na_fila_publica(text, text, text, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fila_publica_status(_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _f record;
  _antes int;
  _media int;
BEGIN
  SELECT f.*, s.nome AS servico_nome, s.duracao_min INTO _f
    FROM public.fila_de_espera f
    LEFT JOIN public.servicos s ON s.id = f.servico_id
   WHERE f.token_publico = _token;
  IF _f.id IS NULL THEN RETURN NULL; END IF;

  SELECT count(*) INTO _antes FROM public.fila_de_espera
   WHERE tenant_id = _f.tenant_id AND status IN ('aguardando', 'avisado') AND posicao < _f.posicao;

  SELECT coalesce(round(avg(duracao_min)), 30) INTO _media FROM public.servicos
   WHERE tenant_id = _f.tenant_id AND ativo = true;

  RETURN jsonb_build_object(
    'status', _f.status,
    'posicao', CASE WHEN _f.status IN ('aguardando','avisado') THEN _antes + 1 ELSE 0 END,
    'pessoas_na_frente', _antes,
    'servico', _f.servico_nome,
    'espera_min', CASE WHEN _f.status IN ('aguardando','avisado') THEN _antes * coalesce(_f.duracao_min, _media) ELSE 0 END,
    'avisado', _f.avisado_em IS NOT NULL,
    'entrou_em', _f.criado_em
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fila_publica_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fila_publica_status(text) TO anon, authenticated, service_role;

-- 5. Trigger de atualização
CREATE OR REPLACE FUNCTION public.atualizar_atualizado_em_generico()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;

CREATE TRIGGER horarios_atualizado_em BEFORE UPDATE ON public.horarios_de_funcionamento
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();
CREATE TRIGGER onboarding_atualizado_em BEFORE UPDATE ON public.onboarding_do_tenant
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();
CREATE TRIGGER conversas_ia_atualizado_em BEFORE UPDATE ON public.conversas_de_ia
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();