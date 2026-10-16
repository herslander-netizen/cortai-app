-- Quem pode receber WhatsApp automático (análise de 11/10/2026, aprovada pelo dono).
-- Só acréscimo: três colunas na ficha. As fichas que já existem continuam recebendo
-- (confirmadas na data de criação); as novas, vindas do link, da fila ou do app,
-- só recebem depois que a pessoa escreve para o negócio ou manda o código.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS whatsapp_confirmado_em timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_parado_em timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_parado_motivo text;
COMMENT ON COLUMN public.clientes.whatsapp_confirmado_em IS
  'Quando o telefone foi confirmado: a pessoa escreveu para o negócio ou mandou o código. Fichas do link, da fila e do app só recebem WhatsApp automático com ele preenchido.';
COMMENT ON COLUMN public.clientes.whatsapp_parado_em IS
  'A pessoa pediu para parar (SAIR) ou disse que o número é errado: nenhuma mensagem automática sai para ela. VOLTAR limpa.';
COMMENT ON COLUMN public.clientes.whatsapp_parado_motivo IS 'sair | numero_errado';

UPDATE public.clientes
   SET whatsapp_confirmado_em = criado_em
 WHERE whatsapp_confirmado_em IS NULL;
