ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS motivo_encerramento text;
ALTER TABLE public.comandas DROP CONSTRAINT IF EXISTS comandas_motivo_encerramento_check;
ALTER TABLE public.comandas ADD CONSTRAINT comandas_motivo_encerramento_check
  CHECK (motivo_encerramento IS NULL OR motivo_encerramento IN ('cancelamento','remarcacao','falta'));

-- Fonte única: cria (ou devolve) a comanda do agendamento. Nunca duplica.
CREATE OR REPLACE FUNCTION public.garantir_comanda(_agendamento_id uuid, _ator uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.agendamentos%ROWTYPE; s public.servicos%ROWTYPE; cfg public.configuracoes_financeiras%ROWTYPE;
  cid uuid; quem uuid; preco int; pct numeric;
BEGIN
  SELECT * INTO a FROM public.agendamentos WHERE id = _agendamento_id;
  IF a.id IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO cid FROM public.comandas WHERE tenant_id = a.tenant_id AND agendamento_id = a.id;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  IF a.status IN ('cancelado','nao_compareceu','remarcado') THEN RETURN NULL; END IF;
  quem := COALESCE(_ator, auth.uid(),
    (SELECT user_id FROM public.tenant_usuarios WHERE tenant_id = a.tenant_id AND papel = 'dono' ORDER BY criado_em LIMIT 1),
    (SELECT user_id FROM public.tenant_usuarios WHERE tenant_id = a.tenant_id ORDER BY criado_em LIMIT 1));
  IF quem IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.configuracoes_financeiras(tenant_id) VALUES (a.tenant_id) ON CONFLICT DO NOTHING;
  SELECT * INTO cfg FROM public.configuracoes_financeiras WHERE tenant_id = a.tenant_id;
  IF a.servico_id IS NOT NULL THEN
    SELECT * INTO s FROM public.servicos WHERE id = a.servico_id AND tenant_id = a.tenant_id;
  END IF;
  preco := COALESCE(s.preco_centavos, 0);
  INSERT INTO public.comandas(tenant_id, cliente_id, profissional_id, agendamento_id, status, aberta_por, subtotal_centavos, total_centavos)
  VALUES (a.tenant_id, a.cliente_id, a.profissional_id, a.id, 'aberta', quem, preco, preco)
  ON CONFLICT (tenant_id, agendamento_id) DO NOTHING
  RETURNING id INTO cid;
  IF cid IS NULL THEN
    SELECT id INTO cid FROM public.comandas WHERE tenant_id = a.tenant_id AND agendamento_id = a.id;
    RETURN cid;
  END IF;
  IF s.id IS NOT NULL THEN
    pct := COALESCE(s.comissao_percentual, cfg.comissao_servico_percentual, 0);
    INSERT INTO public.comanda_itens(comanda_id, tipo, servico_id, descricao, quantidade, valor_unitario_centavos, valor_total_centavos, comissao_percentual, comissao_centavos)
    VALUES (cid, 'servico', s.id, s.nome, 1, preco, preco, pct, round(preco * pct / 100.0));
  END IF;
  RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.garantir_comanda(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.garantir_comanda(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.agendamento_criar_comanda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.garantir_comanda(NEW.id, NULL);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_agendamento_criar_comanda ON public.agendamentos;
CREATE TRIGGER trg_agendamento_criar_comanda AFTER INSERT ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_criar_comanda();

-- Encerramento: comanda não paga vira cancelada (histórico preservado); paga nunca muda.
CREATE OR REPLACE FUNCTION public.agendamento_encerrar_comanda() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('cancelado','remarcado','nao_compareceu') THEN
    UPDATE public.comandas SET status = 'cancelada',
      motivo_encerramento = CASE NEW.status WHEN 'cancelado' THEN 'cancelamento' WHEN 'remarcado' THEN 'remarcacao' ELSE 'falta' END,
      atualizado_em = now()
    WHERE tenant_id = NEW.tenant_id AND agendamento_id = NEW.id
      AND status IN ('aberta','em_atendimento','aguardando_pagamento');
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_agendamento_encerrar_comanda ON public.agendamentos;
CREATE TRIGGER trg_agendamento_encerrar_comanda AFTER UPDATE OF status ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_encerrar_comanda();

-- Fechamento reaproveita a comanda e só muda aberta -> em_atendimento.
CREATE OR REPLACE FUNCTION public.preparar_comanda_segura(_ator uuid, _agendamento_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.agendamentos%ROWTYPE; cid uuid;
BEGIN
 SELECT * INTO a FROM public.agendamentos WHERE id=_agendamento_id FOR UPDATE;
 IF a.id IS NULL OR NOT (public.financeiro_tem_permissao(_ator,a.tenant_id,'confirmar_pagamento') OR public.eh_profissional_do(_ator,a.profissional_id)) THEN RAISE EXCEPTION 'sem permissao'; END IF;
 IF a.status IN ('cancelado','nao_compareceu','remarcado') THEN RAISE EXCEPTION 'agendamento nao pode ser atendido'; END IF;
 cid := public.garantir_comanda(a.id, _ator);
 IF cid IS NULL THEN RAISE EXCEPTION 'nao foi possivel abrir a comanda'; END IF;
 UPDATE public.comandas SET status='em_atendimento', atualizado_em=now() WHERE id=cid AND status='aberta';
 RETURN cid;
END $$;

-- Compatibilidade: agendamentos ativos sem comanda (idempotente).
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT a.id FROM public.agendamentos a
    WHERE a.status IN ('agendado','chegou','na_cadeira')
      AND NOT EXISTS (SELECT 1 FROM public.comandas c WHERE c.agendamento_id = a.id)
  LOOP PERFORM public.garantir_comanda(r.id, NULL); END LOOP;
END $$;