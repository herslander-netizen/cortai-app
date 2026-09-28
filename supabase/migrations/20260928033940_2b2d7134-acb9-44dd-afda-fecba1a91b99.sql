CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.chaves_internas (
  nome text PRIMARY KEY,
  valor text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.chaves_internas TO service_role;
REVOKE ALL ON public.chaves_internas FROM anon, authenticated;
ALTER TABLE public.chaves_internas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Somente servidor" ON public.chaves_internas FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.chaves_internas (nome, valor)
VALUES ('varredura_whatsapp', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (nome) DO NOTHING;