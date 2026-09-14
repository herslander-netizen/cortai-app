DROP POLICY IF EXISTS "membros veem a integracao da propria barbearia" ON public.integracoes_de_ia;

CREATE POLICY "responsaveis veem a integracao da propria barbearia" ON public.integracoes_de_ia
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'alterar_dados_barbearia'));