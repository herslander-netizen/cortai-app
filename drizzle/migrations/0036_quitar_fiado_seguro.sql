-- Achado C5 (auditoria de 16/10): a quitação de fiado gravava pagamento confirmado, movimento de
-- caixa, saldo do fiado e baixa na carteira em chamadas separadas do servidor, sem trava nem
-- idempotência. Uma falha no meio ou um clique repetido deixava o caixa desencontrado.
-- Agora tudo acontece numa função só, numa transação, com o fiado travado (FOR UPDATE).
-- Idempotência: cada quitação fica registrada pelo par (fiado, saldo de antes). Repetir o mesmo
-- pedido devolve a quitação já feita, sem gravar de novo. Só acréscimos: tabela e função novas.
CREATE TABLE IF NOT EXISTS public.fiado_quitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  fiado_id uuid NOT NULL REFERENCES public.fiados(id) ON DELETE RESTRICT,
  pagamento_id uuid NOT NULL REFERENCES public.pagamentos(id) ON DELETE RESTRICT,
  saldo_antes_centavos integer NOT NULL CHECK (saldo_antes_centavos > 0),
  valor_centavos integer NOT NULL CHECK (valor_centavos > 0),
  saldo_depois_centavos integer NOT NULL CHECK (saldo_depois_centavos >= 0),
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fiado_id, saldo_antes_centavos)
);--> statement-breakpoint
ALTER TABLE public.fiado_quitacoes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON public.fiado_quitacoes FROM anon, authenticated;--> statement-breakpoint
GRANT ALL ON public.fiado_quitacoes TO service_role;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.quitar_fiado_seguro(
  _ator uuid,
  _tenant_id uuid,
  _fiado_id uuid,
  _valor_centavos integer,
  _forma text,
  _saldo_esperado_centavos integer DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  f public.fiados%ROWTYPE;
  q public.fiado_quitacoes%ROWTYPE;
  v_valor integer;
  v_saldo integer;
  v_pg uuid;
  v_sessao uuid;
  v_carteira uuid;
BEGIN
  IF NOT public.financeiro_tem_permissao(_ator, _tenant_id, 'confirmar_pagamento') THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
  IF _forma NOT IN ('pix', 'dinheiro', 'cartao') THEN RAISE EXCEPTION 'forma invalida'; END IF;
  IF _valor_centavos IS NULL OR _valor_centavos <= 0 THEN RAISE EXCEPTION 'valor invalido'; END IF;

  SELECT * INTO f FROM public.fiados WHERE id = _fiado_id AND tenant_id = _tenant_id FOR UPDATE;
  IF f.id IS NULL THEN RAISE EXCEPTION 'fiado nao encontrado'; END IF;

  -- Pedido repetido: a quitação a partir deste saldo já foi feita.
  IF _saldo_esperado_centavos IS NOT NULL THEN
    SELECT * INTO q FROM public.fiado_quitacoes
      WHERE fiado_id = f.id AND saldo_antes_centavos = _saldo_esperado_centavos;
    IF q.id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'idempotente', true,
        'saldo_centavos', q.saldo_depois_centavos, 'pagamento_id', q.pagamento_id);
    END IF;
    IF f.saldo_centavos <> _saldo_esperado_centavos THEN
      RAISE EXCEPTION 'saldo do fiado mudou';
    END IF;
  END IF;

  IF f.status NOT IN ('pendente', 'parcial') OR f.saldo_centavos <= 0 THEN
    RAISE EXCEPTION 'fiado nao esta em aberto';
  END IF;

  v_valor := LEAST(_valor_centavos, f.saldo_centavos);
  v_saldo := f.saldo_centavos - v_valor;

  INSERT INTO public.pagamentos (tenant_id, comanda_id, forma_pagamento, valor_centavos, status,
                                 criado_por, confirmado_por, confirmado_em)
  VALUES (f.tenant_id, f.comanda_id, _forma, v_valor, 'confirmado', _ator, _ator, now())
  RETURNING id INTO v_pg;

  SELECT id INTO v_sessao FROM public.caixa_sessoes
    WHERE tenant_id = f.tenant_id AND status = 'aberto' LIMIT 1;
  INSERT INTO public.caixa_movimentos (tenant_id, caixa_sessao_id, comanda_id, pagamento_id,
    cliente_id, profissional_id, tipo, categoria, descricao, valor_centavos, forma_pagamento, criado_por)
  VALUES (f.tenant_id, v_sessao, f.comanda_id, v_pg, f.cliente_id, f.profissional_id, 'entrada',
    'fiado', 'Quitação de fiado', v_valor, _forma, _ator);

  UPDATE public.fiados SET
    valor_pago_centavos = valor_pago_centavos + v_valor,
    saldo_centavos = v_saldo,
    status = CASE WHEN v_saldo = 0 THEN 'quitado' ELSE 'parcial' END,
    quitado_em = CASE WHEN v_saldo = 0 THEN now() ELSE NULL END
  WHERE id = f.id;

  SELECT id INTO v_carteira FROM public.carteiras
    WHERE tenant_id = f.tenant_id AND cliente_id = f.cliente_id;
  IF v_carteira IS NOT NULL THEN
    INSERT INTO public.movimentos (carteira_id, tipo, centavos_delta, origem, comanda_id, descricao, criado_por)
    VALUES (v_carteira, 'baixa', v_valor, 'fiado', f.comanda_id,
      CASE WHEN v_saldo = 0 THEN 'Fiado quitado' ELSE 'Baixa parcial de fiado' END, _ator);
  END IF;

  INSERT INTO public.fiado_quitacoes (tenant_id, fiado_id, pagamento_id, saldo_antes_centavos,
    valor_centavos, saldo_depois_centavos, criado_por)
  VALUES (f.tenant_id, f.id, v_pg, f.saldo_centavos, v_valor, v_saldo, _ator);

  RETURN jsonb_build_object('ok', true, 'idempotente', false, 'saldo_centavos', v_saldo,
    'pagamento_id', v_pg);
END;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.quitar_fiado_seguro(uuid, uuid, uuid, integer, text, integer) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.quitar_fiado_seguro(uuid, uuid, uuid, integer, text, integer) TO service_role;
