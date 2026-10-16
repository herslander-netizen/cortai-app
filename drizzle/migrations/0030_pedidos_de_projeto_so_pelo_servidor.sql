-- Pedidos de projeto (formulário público) passam a entrar só pelo servidor, que aplica limite
-- de envios por IP e por WhatsApp (enviarPedidoDeProjeto). Antes, qualquer visitante podia
-- inserir direto pela API sem limite. Leitura e atualização continuam só para o admin.
-- Troca de política sem apagar dados (mesmo padrão das migrações anteriores).
DROP POLICY IF EXISTS "Qualquer pessoa pode enviar um pedido" ON public.pedidos_de_projeto;--> statement-breakpoint
REVOKE INSERT, TRUNCATE ON public.pedidos_de_projeto FROM anon, authenticated;
