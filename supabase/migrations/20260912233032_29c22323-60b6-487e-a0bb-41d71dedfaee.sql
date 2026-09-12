ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'app';
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_origem_check CHECK (origem IN ('app','manual'));
CREATE INDEX IF NOT EXISTS agendamentos_tenant_origem_idx ON public.agendamentos (tenant_id, origem);