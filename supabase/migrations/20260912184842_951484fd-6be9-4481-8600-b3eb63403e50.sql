-- ============ ENUM de papéis de plataforma ============
CREATE TYPE public.app_role AS ENUM ('admin', 'suporte');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "usuario ve seus papeis" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  telefone text,
  endereco text,
  plano text NOT NULL DEFAULT 'essencial' CHECK (plano IN ('essencial','pro','studio')),
  logo_url text,
  cor_primaria text NOT NULL DEFAULT '#D4AF6A',
  cor_secundaria text,
  cor_accent text,
  tema text NOT NULL DEFAULT 'classica',
  modo text NOT NULL DEFAULT 'auto',
  assinatura_visivel boolean NOT NULL DEFAULT true,
  instagram text,
  whatsapp text,
  facebook text,
  texto_boas_vindas text,
  rotulo_carteira text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- ============ VÍNCULO USUÁRIO x TENANT ============
CREATE TABLE public.tenant_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel text NOT NULL DEFAULT 'barbeiro' CHECK (papel IN ('dono','barbeiro','recepcao')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
GRANT SELECT ON public.tenant_usuarios TO authenticated;
GRANT ALL ON public.tenant_usuarios TO service_role;
ALTER TABLE public.tenant_usuarios ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.tenant_usuarios tu
    WHERE tu.tenant_id = _tenant_id AND tu.user_id = auth.uid()
  )
$$;

CREATE POLICY "membros veem vinculos do tenant" ON public.tenant_usuarios
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));

-- ============ TENANTS: grants + RLS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "membros leem seu tenant" ON public.tenants
  FOR SELECT TO authenticated USING (public.is_tenant_member(id));
CREATE POLICY "membros atualizam seu tenant" ON public.tenants
  FOR UPDATE TO authenticated USING (public.is_tenant_member(id)) WITH CHECK (public.is_tenant_member(id));
CREATE POLICY "admin da plataforma cria tenant" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin da plataforma remove tenant" ON public.tenants
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ PROFISSIONAIS ============
CREATE TABLE public.profissionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  avatar_url text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profissionais_tenant ON public.profissionais(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissionais TO authenticated;
GRANT ALL ON public.profissionais TO service_role;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant gerencia profissionais" ON public.profissionais
  FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

-- ============ SERVIÇOS ============
CREATE TABLE public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  duracao_min integer NOT NULL DEFAULT 30,
  preco_centavos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_servicos_tenant ON public.servicos(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos TO authenticated;
GRANT ALL ON public.servicos TO service_role;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant gerencia servicos" ON public.servicos
  FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

-- ============ CLIENTES ============
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text NOT NULL,
  opt_in_whatsapp boolean NOT NULL DEFAULT false,
  opt_in_em timestamptz,
  limite_fiado_centavos integer NOT NULL DEFAULT 0,
  ficha_tecnica text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, telefone)
);
CREATE INDEX idx_clientes_tenant ON public.clientes(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant gerencia clientes" ON public.clientes
  FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

-- ============ REGRAS DE PLANO ============
CREATE TABLE public.regras_de_plano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('avulso','semanal','mensal','pacote','fiado','fidelidade')),
  ativo boolean NOT NULL DEFAULT false,
  preco_centavos integer NOT NULL DEFAULT 0,
  cota integer,
  validade_dias integer,
  rollover_max integer NOT NULL DEFAULT 0,
  fidelidade_alvo integer,
  restricao_horario jsonb,
  no_show_consome boolean NOT NULL DEFAULT true,
  so_dono_libera_fiado boolean NOT NULL DEFAULT true,
  bloqueia_agendamento_no_limite boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_regras_tenant ON public.regras_de_plano(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regras_de_plano TO authenticated;
GRANT ALL ON public.regras_de_plano TO service_role;
ALTER TABLE public.regras_de_plano ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant gerencia regras" ON public.regras_de_plano
  FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

-- ============ CARTEIRAS (cache de saldo) ============
CREATE TABLE public.carteiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  saldo_creditos integer NOT NULL DEFAULT 0,
  saldo_centavos integer NOT NULL DEFAULT 0,
  fidelidade_progresso integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, cliente_id)
);
CREATE INDEX idx_carteiras_tenant ON public.carteiras(tenant_id);
-- saldos nunca podem ser escritos direto: sem UPDATE para authenticated
GRANT SELECT, INSERT ON public.carteiras TO authenticated;
GRANT ALL ON public.carteiras TO service_role;
ALTER TABLE public.carteiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant le carteiras" ON public.carteiras
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "tenant cria carteiras" ON public.carteiras
  FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id) AND saldo_creditos = 0 AND saldo_centavos = 0 AND fidelidade_progresso = 0);

-- ============ MOVIMENTOS (append-only, fonte da verdade) ============
CREATE TABLE public.movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carteira_id uuid NOT NULL REFERENCES public.carteiras(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('credito','debito','fiado','baixa','expiracao','rollover','fidelidade','perda')),
  creditos_delta integer NOT NULL DEFAULT 0,
  centavos_delta integer NOT NULL DEFAULT 0,
  origem text CHECK (origem IN ('avulso','semanal','mensal','pacote','fidelidade','fiado','ajuste')),
  agendamento_id uuid,
  descricao text,
  expira_em timestamptz,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_movimentos_carteira ON public.movimentos(carteira_id, criado_em);
GRANT SELECT, INSERT ON public.movimentos TO authenticated;
GRANT ALL ON public.movimentos TO service_role;
ALTER TABLE public.movimentos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.carteira_pertence_ao_membro(_carteira_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.carteiras c
    WHERE c.id = _carteira_id AND public.is_tenant_member(c.tenant_id)
  )
$$;

CREATE POLICY "tenant le movimentos" ON public.movimentos
  FOR SELECT TO authenticated USING (public.carteira_pertence_ao_membro(carteira_id));
CREATE POLICY "tenant lanca movimentos" ON public.movimentos
  FOR INSERT TO authenticated WITH CHECK (public.carteira_pertence_ao_membro(carteira_id));

-- append-only: bloqueia UPDATE e DELETE para qualquer papel
CREATE OR REPLACE FUNCTION public.movimentos_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'movimentos e append-only: UPDATE/DELETE nao sao permitidos';
END;
$$;
CREATE TRIGGER trg_movimentos_no_update BEFORE UPDATE ON public.movimentos
  FOR EACH ROW EXECUTE FUNCTION public.movimentos_append_only();
CREATE TRIGGER trg_movimentos_no_delete BEFORE DELETE ON public.movimentos
  FOR EACH ROW EXECUTE FUNCTION public.movimentos_append_only();

-- carteiras: saldos só mudam via trigger de movimentos
CREATE OR REPLACE FUNCTION public.carteiras_saldo_protegido()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.saldo_creditos IS DISTINCT FROM OLD.saldo_creditos
      OR NEW.saldo_centavos IS DISTINCT FROM OLD.saldo_centavos
      OR NEW.fidelidade_progresso IS DISTINCT FROM OLD.fidelidade_progresso)
     AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'saldos de carteiras sao derivados de movimentos e nao podem ser escritos diretamente';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_carteiras_saldo_protegido BEFORE UPDATE ON public.carteiras
  FOR EACH ROW EXECUTE FUNCTION public.carteiras_saldo_protegido();

-- recalcula o cache a partir da soma dos movimentos
CREATE OR REPLACE FUNCTION public.recalcular_carteira()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.carteiras c
  SET saldo_creditos = agg.creditos,
      saldo_centavos = agg.centavos,
      fidelidade_progresso = agg.fidelidade,
      atualizado_em = now()
  FROM (
    SELECT
      COALESCE(SUM(m.creditos_delta), 0)::int AS creditos,
      COALESCE(SUM(m.centavos_delta), 0)::int AS centavos,
      COALESCE(SUM(CASE WHEN m.tipo = 'fidelidade' THEN m.creditos_delta ELSE 0 END), 0)::int AS fidelidade
    FROM public.movimentos m
    WHERE m.carteira_id = NEW.carteira_id
  ) agg
  WHERE c.id = NEW.carteira_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_movimentos_recalcula AFTER INSERT ON public.movimentos
  FOR EACH ROW EXECUTE FUNCTION public.recalcular_carteira();

-- ============ AGENDAMENTOS ============
CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  profissional_id uuid REFERENCES public.profissionais(id) ON DELETE SET NULL,
  servico_id uuid REFERENCES public.servicos(id) ON DELETE SET NULL,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','concluido','cancelado','falta')),
  forma_pagamento text CHECK (forma_pagamento IN ('credito','pix','balcao','fiado')),
  valor_centavos integer NOT NULL DEFAULT 0,
  cancelado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agendamentos_tenant_inicio ON public.agendamentos(tenant_id, inicio);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant gerencia agendamentos" ON public.agendamentos
  FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

-- ============ FILA DE ESPERA ============
CREATE TABLE public.fila_de_espera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  profissional_id uuid REFERENCES public.profissionais(id) ON DELETE SET NULL,
  janela_preferida jsonb,
  posicao integer NOT NULL DEFAULT 0,
  avisado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fila_tenant ON public.fila_de_espera(tenant_id, posicao);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fila_de_espera TO authenticated;
GRANT ALL ON public.fila_de_espera TO service_role;
ALTER TABLE public.fila_de_espera ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant gerencia fila" ON public.fila_de_espera
  FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

-- Seeds de demonstração removidos na branch de reconstrução.
