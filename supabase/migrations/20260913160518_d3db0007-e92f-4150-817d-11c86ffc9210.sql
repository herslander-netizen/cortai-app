DROP POLICY "tenant gerencia agendamentos" ON public.agendamentos;
CREATE POLICY "tenant gerencia agendamentos" ON public.agendamentos
  FOR ALL TO authenticated
  USING (is_tenant_member(tenant_id))
  WITH CHECK (
    is_tenant_member(tenant_id)
    AND (pagamento_confirmado_por IS NULL OR pagamento_confirmado_por = auth.uid())
  );

DROP POLICY "tenant lanca movimentos" ON public.movimentos;
CREATE POLICY "tenant lanca movimentos" ON public.movimentos
  FOR INSERT TO authenticated
  WITH CHECK (
    carteira_pertence_ao_membro(carteira_id)
    AND (criado_por IS NULL OR criado_por = auth.uid())
  );

DROP POLICY "tenant gerencia vendas" ON public.vendas;
CREATE POLICY "tenant gerencia vendas" ON public.vendas
  FOR ALL TO authenticated
  USING (is_tenant_member(tenant_id))
  WITH CHECK (
    is_tenant_member(tenant_id)
    AND (criado_por IS NULL OR criado_por = auth.uid())
  );