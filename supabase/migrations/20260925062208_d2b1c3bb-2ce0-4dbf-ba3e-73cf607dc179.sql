ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS ficha_chips text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alergias text;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS chips_ficha text[] NOT NULL DEFAULT ARRAY['Degradê','Máquina 1','Barba marcada','Pouca conversa'];

CREATE TABLE public.fotos_de_corte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  caminho text NOT NULL,
  consentimento_em timestamptz NOT NULL,
  registrado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fotos_de_corte_cliente_idx ON public.fotos_de_corte (cliente_id, criado_em DESC);

GRANT SELECT ON public.fotos_de_corte TO authenticated;
GRANT ALL ON public.fotos_de_corte TO service_role;
ALTER TABLE public.fotos_de_corte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membros da barbearia veem fotos de corte"
  ON public.fotos_de_corte FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));