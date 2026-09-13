CREATE TABLE public.parceiros_da_plataforma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  logo_url text,
  link text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.parceiros_da_plataforma TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parceiros_da_plataforma TO authenticated;
GRANT ALL ON public.parceiros_da_plataforma TO service_role;

ALTER TABLE public.parceiros_da_plataforma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um ve parceiros ativos"
  ON public.parceiros_da_plataforma FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia parceiros"
  ON public.parceiros_da_plataforma FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER parceiros_atualizado_em
  BEFORE UPDATE ON public.parceiros_da_plataforma
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

CREATE INDEX parceiros_ordem_idx ON public.parceiros_da_plataforma (ativo, ordem);