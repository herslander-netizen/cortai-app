-- Somente leitura: conferência da fila ANTES de qualquer migração aditiva.
-- Pode rodar no banco de prévia atual, mesmo sem coluna oferta_atual_id.
-- Não altera dados e não contém identificadores pessoais de clientes.
-- Aviso manual na fila de chegada (janela_preferida NULL) não exige oferta.
-- Ofertas ativas para a fila de chegada são inconsistência.
-- O resultado `pronto_para_revisao` NÃO autoriza uma implantação automática.
WITH
ativas AS (
  SELECT id, fila_id, tenant_id, agendamento_liberado_id,
         inicio, expira_em
    FROM public.ofertas_da_fila WHERE status = 'enviada'
),
dupl_entrada AS (
  SELECT fila_id FROM ativas GROUP BY fila_id HAVING count(*) > 1
),
dupl_vaga AS (
  SELECT agendamento_liberado_id FROM ativas
   WHERE agendamento_liberado_id IS NOT NULL
   GROUP BY agendamento_liberado_id HAVING count(*) > 1
),
ofertas_orfas AS (
  SELECT a.id FROM ativas a
    LEFT JOIN public.fila_de_espera f
      ON f.id = a.fila_id AND f.tenant_id = a.tenant_id
   WHERE f.id IS NULL
),
avisados_sem_oferta AS (
  SELECT f.id FROM public.fila_de_espera f
    LEFT JOIN ativas a ON a.fila_id = f.id AND a.tenant_id = f.tenant_id
   WHERE f.status = 'avisado' AND f.janela_preferida IS NOT NULL AND a.id IS NULL
),
ofertas_sem_aviso AS (
  SELECT a.id FROM ativas a
    JOIN public.fila_de_espera f
      ON f.id = a.fila_id AND f.tenant_id = a.tenant_id
   WHERE f.status <> 'avisado' OR f.janela_preferida IS NULL
),
ofertas_sem_vaga AS (
  SELECT id FROM ativas WHERE agendamento_liberado_id IS NULL
),
resumo AS (
  SELECT
    (SELECT count(*) FROM ativas)::int ofertas_ativas,
    (SELECT count(*) FROM public.fila_de_espera WHERE status = 'avisado')::int entradas_avisadas,
    (SELECT count(*) FROM dupl_entrada)::int duplicidades_por_entrada,
    (SELECT count(*) FROM dupl_vaga)::int duplicidades_por_vaga,
    (SELECT count(*) FROM ofertas_orfas)::int ofertas_sem_entrada_do_tenant,
    (SELECT count(*) FROM avisados_sem_oferta)::int avisados_sem_oferta,
    (SELECT count(*) FROM ofertas_sem_aviso)::int ofertas_sem_status_avisado,
    (SELECT count(*) FROM ofertas_sem_vaga)::int ofertas_ativas_sem_vaga
)
SELECT *,
  (
    duplicidades_por_entrada = 0
    AND duplicidades_por_vaga = 0
    AND ofertas_sem_entrada_do_tenant = 0
    AND avisados_sem_oferta = 0
    AND ofertas_sem_status_avisado = 0
    AND ofertas_ativas_sem_vaga = 0
  ) AS pronto_para_revisao
FROM resumo;
