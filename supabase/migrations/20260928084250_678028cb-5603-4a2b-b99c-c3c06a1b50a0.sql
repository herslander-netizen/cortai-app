SELECT cron.alter_job(1, command := $cmd$
  SELECT net.http_post(
    url := 'https://cortai.dev/api/public/whatsapp/automacoes',
    headers := jsonb_build_object('Content-Type','application/json','x-cortai-varredura',(SELECT valor FROM public.chaves_internas WHERE nome='varredura_whatsapp')),
    body := '{}'::jsonb
  );
$cmd$);