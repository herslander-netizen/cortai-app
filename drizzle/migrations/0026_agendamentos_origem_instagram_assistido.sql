ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_origem_check;
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_origem_check
  CHECK (origem = ANY (ARRAY['app'::text, 'manual'::text, 'link_publico'::text, 'whatsapp'::text, 'instagram'::text]));
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS assistido_por_cortai boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.agendamentos.assistido_por_cortai IS 'true quando uma ação do CortAI criou, remarcou ou cancelou este agendamento. Independente de origem.';