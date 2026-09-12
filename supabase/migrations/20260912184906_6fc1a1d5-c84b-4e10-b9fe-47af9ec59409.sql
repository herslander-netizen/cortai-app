-- Funções de gatilho: ninguém chama diretamente
REVOKE ALL ON FUNCTION public.movimentos_append_only() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.carteiras_saldo_protegido() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalcular_carteira() FROM PUBLIC, anon, authenticated;

-- Helpers de RLS: apenas usuários autenticados (necessário para as policies)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.carteira_pertence_ao_membro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.carteira_pertence_ao_membro(uuid) TO authenticated;