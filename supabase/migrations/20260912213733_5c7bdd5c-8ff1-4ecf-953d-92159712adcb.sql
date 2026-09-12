CREATE TABLE public.emails_admin_autorizados (
  email text PRIMARY KEY,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.emails_admin_autorizados TO service_role;
ALTER TABLE public.emails_admin_autorizados ENABLE ROW LEVEL SECURITY;
INSERT INTO public.emails_admin_autorizados (email) VALUES ('herslander@gmail.com') ON CONFLICT DO NOTHING;