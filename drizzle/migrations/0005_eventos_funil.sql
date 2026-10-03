CREATE TABLE public.eventos_funil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  experiencia text NOT NULL CHECK (experiencia IN ('vitrine','direta','conversa')),
  fluxo text CHECK (fluxo IN ('passo_a_passo','conversa')),
  etapa text NOT NULL CHECK (etapa IN ('vitrine_visita','agendamento_aberto','servico_escolhido','horario_escolhido','dados_enviados','confirmado')),
  origem text NOT NULL DEFAULT 'direto' CHECK (origem IN ('instagram','whatsapp','google','facebook','tiktok','qr','compartilhar','link','direto','outro'))
);
GRANT ALL ON public.eventos_funil TO service_role;
ALTER TABLE public.eventos_funil ENABLE ROW LEVEL SECURITY;
CREATE INDEX eventos_funil_tenant_criado ON public.eventos_funil (tenant_id, criado_em DESC);
COMMENT ON TABLE public.eventos_funil IS 'Funil anônimo da página pública: sem dado pessoal; gravado só pelo servidor.';