ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS indicacao_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS indicacao_codigo text,
  ADD COLUMN IF NOT EXISTS indicacao_recompensa text,
  ADD COLUMN IF NOT EXISTS link_avaliacao_publica text;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_indicacao_codigo_key ON public.tenants (indicacao_codigo) WHERE indicacao_codigo IS NOT NULL;

ALTER TABLE public.profissionais
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS portfolio jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS recorrencia text;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'balcao';

CREATE TABLE IF NOT EXISTS public.indicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  indicador_cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  indicado_cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  indicado_nome text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  recompensa text,
  recompensa_entregue boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  convertido_em timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicacoes TO authenticated;
GRANT ALL ON public.indicacoes TO service_role;
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe da barbearia gerencia indicacoes" ON public.indicacoes
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));

CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agendamento_id uuid NOT NULL UNIQUE REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  profissional_id uuid REFERENCES public.profissionais(id) ON DELETE SET NULL,
  nota integer NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text,
  convite_publico_enviado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe da barbearia gerencia avaliacoes" ON public.avaliacoes
  FOR ALL TO authenticated
  USING (public.is_tenant_member(tenant_id))
  WITH CHECK (public.is_tenant_member(tenant_id));