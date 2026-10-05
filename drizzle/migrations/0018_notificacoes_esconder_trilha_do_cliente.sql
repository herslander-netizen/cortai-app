DROP POLICY IF EXISTS "equipe ve avisos do tenant" ON public.notificacoes;
CREATE POLICY "equipe ve avisos do tenant" ON public.notificacoes FOR SELECT TO authenticated
  USING (is_tenant_member(tenant_id) AND destinatario_tipo <> 'cliente' AND ((user_id IS NULL) OR (user_id = auth.uid())));