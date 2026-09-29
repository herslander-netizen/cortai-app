-- Os dois índices tinham definição idêntica e nenhum deles sustentava constraint.
-- Mantemos envios_de_whatsapp_agendamento_tipo_uidx, que é o nome mais específico
-- e também o índice efetivamente mais utilizado nas estatísticas atuais.
DROP INDEX IF EXISTS public.envios_de_whatsapp_unico_por_evento;