-- Confirmação do telefone no agendamento público (achado 11 da auditoria de 09/10/2026).
-- Só acréscimo: uma tabela de códigos (só o servidor lê e grava) e uma marca no agendamento.

CREATE TABLE IF NOT EXISTS public.verificacoes_de_telefone (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  telefone text NOT NULL,
  codigo_hash text NOT NULL,
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  verificado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.verificacoes_de_telefone IS
  'Código que o cliente envia pelo WhatsApp ("CODIGO 123456") para provar que o telefone é dele antes de usar a ficha existente no agendamento público. Só o servidor acessa.';
CREATE INDEX IF NOT EXISTS verificacoes_de_telefone_telefone_idx
  ON public.verificacoes_de_telefone (telefone, criado_em DESC);
ALTER TABLE public.verificacoes_de_telefone ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.verificacoes_de_telefone FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.verificacoes_de_telefone TO service_role;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS telefone_nao_confirmado boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.agendamentos.telefone_nao_confirmado IS
  'true quando o agendamento público usou uma ficha existente sem o cliente confirmar o telefone (negócio sem WhatsApp conectado). A equipe vê a marca na agenda.';
