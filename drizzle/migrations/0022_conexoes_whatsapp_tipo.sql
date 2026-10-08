ALTER TABLE public.conexoes_whatsapp ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'atendimento';
UPDATE public.conexoes_whatsapp SET tipo = 'atendimento' WHERE tipo IS DISTINCT FROM 'atendimento';
ALTER TABLE public.conexoes_whatsapp ADD CONSTRAINT conexoes_whatsapp_tipo_valido CHECK (tipo IN ('atendimento','notificacoes'));
ALTER TABLE public.conexoes_whatsapp DROP CONSTRAINT conexoes_whatsapp_tenant_unico;
ALTER TABLE public.conexoes_whatsapp ADD CONSTRAINT conexoes_whatsapp_tenant_tipo_unico UNIQUE (tenant_id, tipo);
COMMENT ON COLUMN public.conexoes_whatsapp.tipo IS 'Finalidade da conexão: atendimento (CortAI/conversas) ou notificacoes (avisos transacionais). Com uma única conexão própria, ela atende os dois papéis.';