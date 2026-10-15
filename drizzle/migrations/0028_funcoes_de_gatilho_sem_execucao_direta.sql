-- Funções de gatilho não são chamadas diretamente por ninguém: o banco as executa
-- quando a tabela muda, sem conferir EXECUTE. Tirar o EXECUTE de PUBLIC/anon/authenticated
-- fecha a chamada direta pela API sem alterar o comportamento dos gatilhos.
-- Mesmo padrão já usado em movimentos_append_only, carteiras_saldo_protegido e recalcular_carteira.
REVOKE ALL ON FUNCTION public.disparar_push_aviso() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.proteger_flag_central() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.agendamento_criar_comanda() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.agendamento_encerrar_comanda() FROM PUBLIC, anon, authenticated;
