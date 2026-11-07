-- Mensagem do negócio depois de agendar (dono, 07/11/2026). Só acréscimo: uma coluna de texto opcional (até 300
-- caracteres) que o cliente vê na confirmação e recebe no WhatsApp. A gravação usa a mesma política de RLS da edição
-- dos dados do negócio (`alterar_dados_barbearia`); nada de função nova.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS mensagem_pos_agendamento text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_mensagem_pos_agendamento_chk') THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_mensagem_pos_agendamento_chk
      CHECK (mensagem_pos_agendamento IS NULL OR char_length(mensagem_pos_agendamento) <= 300);
  END IF;
END $$;

COMMENT ON COLUMN public.tenants.mensagem_pos_agendamento IS
  'Texto opcional (até 300 caracteres) mostrado ao cliente depois de agendar e enviado na confirmação do WhatsApp.';
