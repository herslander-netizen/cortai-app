-- O estado da vitrine pública é independente da loja e da agenda online.
-- O padrão TRUE preserva a publicação de todos os negócios existentes.
ALTER TABLE public.tenant_page_configs
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT true;
