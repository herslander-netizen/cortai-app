UPDATE public.agendamentos SET status = 'cancelado', cancelado_em = now()
 WHERE cliente_id IN (SELECT id FROM public.clientes WHERE nome = 'Cliente Teste QA' AND origem = 'link_publico');
UPDATE public.clientes SET arquivado_em = now()
 WHERE nome = 'Cliente Teste QA' AND origem = 'link_publico';