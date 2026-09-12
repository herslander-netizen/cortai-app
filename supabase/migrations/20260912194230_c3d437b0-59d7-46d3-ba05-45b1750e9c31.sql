ALTER TABLE public.tenants
  ADD COLUMN ciclo text NOT NULL DEFAULT 'mensal' CHECK (ciclo IN ('mensal', 'anual')),
  ADD COLUMN desconto_percentual integer NOT NULL DEFAULT 0 CHECK (desconto_percentual BETWEEN 0 AND 100),
  ADD COLUMN ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN ultimo_acesso_em timestamptz;

CREATE TABLE public.historico_de_plano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plano_de text NOT NULL,
  plano_para text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.historico_de_plano TO authenticated;
GRANT ALL ON public.historico_de_plano TO service_role;
ALTER TABLE public.historico_de_plano ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin le historico de planos"
ON public.historico_de_plano FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX historico_de_plano_tenant_criado_idx
ON public.historico_de_plano (tenant_id, criado_em DESC);

CREATE OR REPLACE FUNCTION public.registrar_mudanca_de_plano()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plano IS DISTINCT FROM OLD.plano THEN
    INSERT INTO public.historico_de_plano (tenant_id, plano_de, plano_para)
    VALUES (NEW.id, OLD.plano, NEW.plano);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tenants_historico_de_plano
AFTER UPDATE OF plano ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.registrar_mudanca_de_plano();

CREATE TABLE public.contatos_de_retencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  canal text NOT NULL CHECK (canal IN ('whatsapp', 'telefone')),
  resultado text NOT NULL CHECK (resultado IN ('sem_resposta', 'conversou', 'recuperou', 'cancelou')),
  observacao text,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.contatos_de_retencao TO authenticated;
GRANT ALL ON public.contatos_de_retencao TO service_role;
ALTER TABLE public.contatos_de_retencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin le contatos de retencao"
ON public.contatos_de_retencao FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin registra contatos de retencao"
ON public.contatos_de_retencao FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND criado_por = auth.uid());
CREATE INDEX contatos_de_retencao_tenant_criado_idx
ON public.contatos_de_retencao (tenant_id, criado_em DESC);

CREATE TABLE public.sugestoes_da_plataforma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido text NOT NULL CHECK (length(trim(pedido)) > 0),
  motivo text NOT NULL CHECK (length(trim(motivo)) > 0),
  canal text NOT NULL CHECK (canal IN ('whatsapp', 'ligacao', 'visita', 'suporte')),
  tenants_que_pediram uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'em_analise' CHECK (status IN ('em_analise', 'no_roteiro', 'em_desenvolvimento', 'implementada', 'recusada')),
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sugestoes_da_plataforma TO authenticated;
GRANT ALL ON public.sugestoes_da_plataforma TO service_role;
ALTER TABLE public.sugestoes_da_plataforma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin gerencia sugestoes"
ON public.sugestoes_da_plataforma FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') AND criado_por = auth.uid());
CREATE INDEX sugestoes_da_plataforma_demanda_idx
ON public.sugestoes_da_plataforma ((cardinality(tenants_que_pediram)) DESC, criado_em DESC);

CREATE TABLE public.configuracoes_da_plataforma (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  preco_essencial_centavos integer NOT NULL DEFAULT 0 CHECK (preco_essencial_centavos >= 0),
  preco_pro_centavos integer NOT NULL DEFAULT 0 CHECK (preco_pro_centavos >= 0),
  preco_studio_centavos integer NOT NULL DEFAULT 0 CHECK (preco_studio_centavos >= 0),
  cor_fundo text NOT NULL DEFAULT '#0B0B0B',
  cor_superficie text NOT NULL DEFAULT '#131312',
  cor_primaria text NOT NULL DEFAULT '#D4AF6A',
  cor_texto text NOT NULL DEFAULT '#F5F5F3',
  tipografia text NOT NULL DEFAULT 'Montserrat',
  raio_px integer NOT NULL DEFAULT 10 CHECK (raio_px BETWEEN 0 AND 24),
  atualizado_por uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.configuracoes_da_plataforma TO authenticated;
GRANT ALL ON public.configuracoes_da_plataforma TO service_role;
ALTER TABLE public.configuracoes_da_plataforma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin le configuracoes da plataforma"
ON public.configuracoes_da_plataforma FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin atualiza configuracoes da plataforma"
ON public.configuracoes_da_plataforma FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') AND atualizado_por = auth.uid());
INSERT INTO public.configuracoes_da_plataforma (id) VALUES (true);

CREATE OR REPLACE FUNCTION public.atualizar_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_sugestoes_atualizado_em
BEFORE UPDATE ON public.sugestoes_da_plataforma
FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();
CREATE TRIGGER trg_configuracoes_atualizado_em
BEFORE UPDATE ON public.configuracoes_da_plataforma
FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

CREATE OR REPLACE FUNCTION public.registrar_acesso_do_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_tenant_member(_tenant_id) THEN
    RAISE EXCEPTION 'acesso negado';
  END IF;
  UPDATE public.tenants
  SET ultimo_acesso_em = now()
  WHERE id = _tenant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_acesso_do_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_acesso_do_tenant(uuid) TO authenticated;