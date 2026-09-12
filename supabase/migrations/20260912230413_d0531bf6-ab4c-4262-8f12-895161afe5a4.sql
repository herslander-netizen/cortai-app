ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS arquivado_em timestamp with time zone;
CREATE INDEX IF NOT EXISTS clientes_tenant_arquivado_idx ON public.clientes (tenant_id, arquivado_em);