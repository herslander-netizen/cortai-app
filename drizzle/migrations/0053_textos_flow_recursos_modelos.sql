-- Restos do nome antigo em textos exibidos (varredura de 30/10/2026). Só troca texto; idempotente.
-- Recurso dos planos: "Secretária Cortaí" = Flow Chat (decisão do dono, 30/10).
UPDATE public.recursos_de_plano
SET rotulo = replace(rotulo, 'Secretária Cortaí', 'Flow Chat')
WHERE rotulo LIKE '%Secretária Cortaí%';
--> statement-breakpoint

-- Rodapé dos modelos de WhatsApp AINDA NÃO SUBMETIDOS à Meta (os aprovados não são tocados: o texto deles é o da Meta).
UPDATE public.modelos_whatsapp
SET rodape = replace(rodape, 'Cortaí', 'Flow')
WHERE rodape LIKE '%Cortaí%' AND status = 'NAO_SUBMETIDO';
