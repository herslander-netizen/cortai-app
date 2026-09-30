ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS foto_url text;

COMMENT ON COLUMN public.servicos.foto_url IS 'Caminho opcional da foto do serviço no armazenamento privado do tenant.';