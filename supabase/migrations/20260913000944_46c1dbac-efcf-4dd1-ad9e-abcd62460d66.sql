ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.auditoria_de_suporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ator_user_id uuid,
  ator_email text,
  acao text NOT NULL,
  alvo text NOT NULL,
  alteracoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.auditoria_de_suporte TO authenticated;
GRANT ALL ON public.auditoria_de_suporte TO service_role;

ALTER TABLE public.auditoria_de_suporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin le auditoria de suporte"
  ON public.auditoria_de_suporte FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'suporte'));

CREATE POLICY "Admin registra auditoria de suporte"
  ON public.auditoria_de_suporte FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'suporte'));

CREATE INDEX IF NOT EXISTS auditoria_de_suporte_tenant_idx
  ON public.auditoria_de_suporte (tenant_id, criado_em DESC);