CREATE TABLE public.home_publica (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  rascunho jsonb NOT NULL DEFAULT '{}'::jsonb,
  publicado jsonb NOT NULL DEFAULT '{}'::jsonb,
  publicado_em timestamp with time zone,
  atualizado_por uuid,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.home_publica TO authenticated;
GRANT ALL ON public.home_publica TO service_role;

ALTER TABLE public.home_publica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin le a home" ON public.home_publica
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin cria a home" ON public.home_publica
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin altera a home" ON public.home_publica
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER home_publica_atualizado_em BEFORE UPDATE ON public.home_publica
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

CREATE TABLE public.home_publica_versoes (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot jsonb NOT NULL,
  rotulo text,
  criado_por uuid,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.home_publica_versoes TO authenticated;
GRANT ALL ON public.home_publica_versoes TO service_role;

ALTER TABLE public.home_publica_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin le versoes da home" ON public.home_publica_versoes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin cria versoes da home" ON public.home_publica_versoes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX home_publica_versoes_criado_em_idx ON public.home_publica_versoes (criado_em DESC);

INSERT INTO public.home_publica (id) VALUES (true);

CREATE OR REPLACE FUNCTION public.home_publicada()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(h.publicado, '{}'::jsonb) FROM public.home_publica h WHERE h.id = true
$$;

REVOKE ALL ON FUNCTION public.home_publicada() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.home_publicada() TO anon, authenticated, service_role;