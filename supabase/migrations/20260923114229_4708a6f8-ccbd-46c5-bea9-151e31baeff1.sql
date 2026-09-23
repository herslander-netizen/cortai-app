CREATE TABLE public.rascunhos_de_barbearia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  origem_ip text,
  publicado_em timestamptz,
  reivindicado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reivindicado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rascunhos_de_barbearia_criado_em_idx ON public.rascunhos_de_barbearia (criado_em DESC);
CREATE INDEX rascunhos_de_barbearia_tenant_idx ON public.rascunhos_de_barbearia (tenant_id);

GRANT ALL ON public.rascunhos_de_barbearia TO service_role;

ALTER TABLE public.rascunhos_de_barbearia ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER rascunhos_de_barbearia_atualizado_em
BEFORE UPDATE ON public.rascunhos_de_barbearia
FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em_generico();