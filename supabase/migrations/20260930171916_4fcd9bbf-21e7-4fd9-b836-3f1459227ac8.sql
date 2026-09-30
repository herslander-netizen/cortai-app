CREATE TABLE public.ofertas_da_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fila_id uuid NOT NULL REFERENCES public.fila_de_espera(id) ON DELETE CASCADE,
  agendamento_liberado_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  profissional_id uuid NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviada','aceita','recusada','expirada','cancelada')),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  expira_em timestamptz NOT NULL,
  enviada_whatsapp boolean NOT NULL DEFAULT false,
  respondida_em timestamptz,
  agendamento_criado_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ofertas_da_fila_uma_ativa_por_vaga ON public.ofertas_da_fila(agendamento_liberado_id) WHERE status = 'enviada';
CREATE UNIQUE INDEX ofertas_da_fila_uma_por_cliente_vaga ON public.ofertas_da_fila(agendamento_liberado_id, fila_id);
CREATE INDEX ofertas_da_fila_tenant ON public.ofertas_da_fila(tenant_id, criado_em DESC);
CREATE INDEX ofertas_da_fila_expira ON public.ofertas_da_fila(expira_em) WHERE status = 'enviada';

GRANT SELECT ON public.ofertas_da_fila TO authenticated;
GRANT ALL ON public.ofertas_da_fila TO service_role;
ALTER TABLE public.ofertas_da_fila ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros veem ofertas do negócio" ON public.ofertas_da_fila
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS origem_fila_id uuid REFERENCES public.fila_de_espera(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.aceitar_oferta_da_fila(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_o public.ofertas_da_fila%ROWTYPE;
  v_f public.fila_de_espera%ROWTYPE;
  v_res jsonb;
  v_ag uuid;
BEGIN
  IF NOT public.chamada_do_servidor() THEN RAISE EXCEPTION 'somente servidor'; END IF;
  SELECT * INTO v_o FROM public.ofertas_da_fila WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'motivo', 'nao_encontrada'); END IF;
  IF v_o.status = 'aceita' THEN RETURN jsonb_build_object('ok', true, 'agendamento_id', v_o.agendamento_criado_id, 'repetida', true); END IF;
  IF v_o.status <> 'enviada' THEN RETURN jsonb_build_object('ok', false, 'motivo', v_o.status); END IF;
  IF v_o.expira_em < now() OR v_o.inicio < now() THEN
    UPDATE public.ofertas_da_fila SET status = 'expirada' WHERE id = v_o.id;
    RETURN jsonb_build_object('ok', false, 'motivo', 'expirada');
  END IF;
  SELECT * INTO v_f FROM public.fila_de_espera WHERE id = v_o.fila_id FOR UPDATE;
  BEGIN
    v_res := public.criar_agendamento(v_o.tenant_id, v_f.cliente_id, v_o.profissional_id, v_o.servico_id, v_o.inicio, 'balcao', false, true);
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.ofertas_da_fila SET status = 'cancelada', respondida_em = now() WHERE id = v_o.id;
    RETURN jsonb_build_object('ok', false, 'motivo', 'ocupado');
  END;
  v_ag := (v_res->>'agendamento_id')::uuid;
  UPDATE public.agendamentos SET origem_fila_id = v_f.id WHERE id = v_ag;
  UPDATE public.ofertas_da_fila SET status = 'aceita', respondida_em = now(), agendamento_criado_id = v_ag WHERE id = v_o.id;
  UPDATE public.fila_de_espera SET status = 'atendido' WHERE id = v_f.id;
  RETURN jsonb_build_object('ok', true, 'agendamento_id', v_ag);
END $$;
REVOKE ALL ON FUNCTION public.aceitar_oferta_da_fila(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aceitar_oferta_da_fila(text) TO service_role;