-- Corrige os dois cron jobs que ainda apontam para um Worker temporário antigo.
-- Atualiza apenas comandos que contenham o host antigo e os endpoints esperados.
-- Aumenta o timeout HTTP para 20 s; o cron padrão de 5 s cortava chamadas longas.
-- Esta migração deve ser aplicada em produção somente após autorização explícita.
DO $migration$
DECLARE
  job record;
  comando text;
BEGIN
  FOR job IN
    SELECT jobid, command
    FROM cron.job
    WHERE command LIKE '%cortai-reconstruction-test-2026.aprovamaisbarra.workers.dev%'
      AND (
        command LIKE '%/api/public/whatsapp/automacoes%'
        OR command LIKE '%/api/public/asaas/varredura%'
      )
  LOOP
    comando := replace(
      job.command,
      'https://cortai-reconstruction-test-2026.aprovamaisbarra.workers.dev',
      'https://cortaiapp.pages.dev'
    );
    comando := replace(
      comando,
      'body := ''{}''::jsonb',
      'body := ''{}''::jsonb, timeout_milliseconds := 20000'
    );

    PERFORM cron.alter_job(job.jobid, command := comando);
  END LOOP;
END
$migration$;
