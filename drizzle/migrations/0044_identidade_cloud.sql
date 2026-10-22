-- Tema Cloud (23/10/2026): acrescenta "cloud" aos temas aceitos. Só amplia a lista; nenhuma linha muda.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_identidade_app_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_identidade_app_check
  CHECK (identidade_app IN ('moderno', 'rose', 'indigo', 'copper', 'classico', 'cloud'));
