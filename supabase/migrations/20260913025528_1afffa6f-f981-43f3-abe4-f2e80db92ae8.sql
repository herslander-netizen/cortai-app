CREATE TABLE public.aceites_legais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documento text NOT NULL,
  versao text NOT NULL,
  aceito boolean NOT NULL DEFAULT true,
  origem text NOT NULL DEFAULT 'cadastro',
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX aceites_legais_user_doc_idx ON public.aceites_legais (user_id, documento, criado_em DESC);

GRANT SELECT, INSERT ON public.aceites_legais TO authenticated;
GRANT ALL ON public.aceites_legais TO service_role;

ALTER TABLE public.aceites_legais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cada um vê os próprios aceites"
  ON public.aceites_legais FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Cada um registra os próprios aceites"
  ON public.aceites_legais FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);