ALTER TABLE public.tenants
ADD COLUMN identidade_app text NOT NULL DEFAULT 'moderno';

ALTER TABLE public.tenants
ADD CONSTRAINT tenants_identidade_app_check
CHECK (identidade_app IN ('moderno', 'blue', 'indigo', 'copper', 'classico'));

COMMENT ON COLUMN public.tenants.identidade_app IS 'Identidade visual do aplicativo da equipe, independente do tema da pagina publica.';