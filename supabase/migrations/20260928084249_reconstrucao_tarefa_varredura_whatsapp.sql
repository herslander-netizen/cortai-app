-- Reconstrução fora do Lovable: a tarefa agendada da varredura do WhatsApp foi criada direto
-- no banco original, sem migração. A migração seguinte (20260928084250) altera a tarefa nº 1,
-- então ela precisa existir antes. Num banco novo, esta é a primeira tarefa e recebe o nº 1.
-- Nome e intervalo: docs/seguranca-e-testes.md e docs/mapa-do-codigo.md (a cada 15 min).
-- O comando definitivo vem da migração seguinte.
SELECT cron.schedule('cortai-varredura-whatsapp', '*/15 * * * *', $cmd$
  SELECT net.http_post(
    url := 'https://cortai.dev/api/public/whatsapp/automacoes',
    headers := jsonb_build_object('Content-Type','application/json','x-cortai-varredura',(SELECT valor FROM public.chaves_internas WHERE nome='varredura_whatsapp')),
    body := '{}'::jsonb
  );
$cmd$);
