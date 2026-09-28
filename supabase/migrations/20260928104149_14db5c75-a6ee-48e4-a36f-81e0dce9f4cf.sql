ALTER TABLE public.tenants
  ALTER COLUMN modo SET DEFAULT 'escuro';

ALTER TABLE public.tenants
  ALTER COLUMN cor_primaria DROP NOT NULL,
  ALTER COLUMN cor_primaria DROP DEFAULT;

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_identidade_app_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_identidade_app_check
  CHECK (identidade_app IN ('moderno', 'indigo', 'copper', 'classico'));