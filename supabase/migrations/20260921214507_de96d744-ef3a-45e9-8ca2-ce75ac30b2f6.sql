-- Idempotência real: um único envio por agendamento + tipo.
DELETE FROM public.envios_de_whatsapp a
USING public.envios_de_whatsapp b
WHERE a.agendamento_id IS NOT NULL
  AND a.agendamento_id = b.agendamento_id
  AND a.tipo = b.tipo
  AND a.criado_em < b.criado_em;

CREATE UNIQUE INDEX IF NOT EXISTS envios_de_whatsapp_agendamento_tipo_uidx
  ON public.envios_de_whatsapp (agendamento_id, tipo)
  WHERE agendamento_id IS NOT NULL;

-- Busca eficiente dos lembretes por janela de horário.
CREATE INDEX IF NOT EXISTS agendamentos_inicio_status_idx
  ON public.agendamentos (inicio, status);

CREATE INDEX IF NOT EXISTS envios_de_whatsapp_tenant_status_idx
  ON public.envios_de_whatsapp (tenant_id, status, criado_em DESC);