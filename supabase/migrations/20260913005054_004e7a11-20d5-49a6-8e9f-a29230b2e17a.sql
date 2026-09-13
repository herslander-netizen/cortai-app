REVOKE ALL ON FUNCTION public.has_tenant_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_tenant_permission(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.registrar_auditoria_barbearia(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria_barbearia(uuid, text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_agendamento(uuid, text) TO service_role;