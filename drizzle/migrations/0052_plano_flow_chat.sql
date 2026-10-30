-- Plano Conecta: "Secretária Flow" passa a se chamar "Flow Chat" (decisão do dono, 30/10/2026: "Secretária Flow = Flow Chat").
-- Só troca o texto exibido na descrição do plano. Idempotente: só alcança linhas que ainda têm o nome antigo.
UPDATE public.planos_da_plataforma
SET descricao = replace(descricao, 'Secretária Flow', 'Flow Chat')
WHERE descricao LIKE '%Secretária Flow%';
