ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS capa_url text,
  ADD COLUMN IF NOT EXISTS fotos jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  foto_url text,
  categoria text NOT NULL DEFAULT 'Outros',
  custo_centavos integer NOT NULL DEFAULT 0 CHECK (custo_centavos >= 0),
  preco_centavos integer NOT NULL DEFAULT 0 CHECK (preco_centavos >= 0),
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  estoque_minimo integer NOT NULL DEFAULT 3 CHECK (estoque_minimo >= 0),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT SELECT ON public.produtos TO anon;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publico ve produtos ativos" ON public.produtos FOR SELECT TO anon USING (ativo = true);
CREATE POLICY "tenant le produtos" ON public.produtos FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "tenant cria produtos" ON public.produtos FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id));
CREATE POLICY "tenant atualiza produtos" ON public.produtos FOR UPDATE TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));
CREATE POLICY "tenant remove produtos" ON public.produtos FOR DELETE TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE TRIGGER produtos_atualizado_em BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  categoria text NOT NULL DEFAULT 'produtos' CHECK (categoria IN ('servicos', 'produtos', 'outros')),
  descricao text,
  total_centavos integer NOT NULL DEFAULT 0 CHECK (total_centavos >= 0),
  forma_pagamento text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant gerencia vendas" ON public.vendas FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

CREATE TABLE public.venda_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos integer NOT NULL CHECK (preco_unitario_centavos >= 0),
  custo_unitario_centavos integer NOT NULL DEFAULT 0 CHECK (custo_unitario_centavos >= 0),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venda_itens TO authenticated;
GRANT ALL ON public.venda_itens TO service_role;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant gerencia itens de venda" ON public.venda_itens FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND public.is_tenant_member(v.tenant_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_id AND public.is_tenant_member(v.tenant_id)));

CREATE OR REPLACE FUNCTION public.registrar_venda_produto(
  _produto_id uuid,
  _quantidade integer,
  _forma_pagamento text DEFAULT 'balcao'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.produtos%ROWTYPE;
  v_id uuid;
  total integer;
BEGIN
  IF _quantidade <= 0 THEN RAISE EXCEPTION 'quantidade invalida'; END IF;
  SELECT * INTO p FROM public.produtos WHERE id = _produto_id FOR UPDATE;
  IF p.id IS NULL OR NOT public.is_tenant_member(p.tenant_id) THEN RAISE EXCEPTION 'produto nao encontrado'; END IF;
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
$$;
REVOKE ALL ON FUNCTION public.registrar_venda_produto(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_venda_produto(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_venda_produto(uuid, integer, text) TO service_role;