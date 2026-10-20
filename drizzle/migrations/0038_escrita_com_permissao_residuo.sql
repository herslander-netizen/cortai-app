-- Resíduo do achado 6 (auditoria de 09/10/2026): sete tabelas ainda aceitavam escrita direta de
-- QUALQUER membro ativo (só is_tenant_member). Mesmo padrão da 0027: a leitura da equipe fica
-- igual e a escrita passa a exigir a permissão do papel (tem_alguma_permissao). Nada é apagado:
-- só políticas. O servidor (service_role) e as RPCs SECURITY DEFINER continuam como antes; a
-- política do cliente sobre os próprios avisos não muda.

-- 1) clientes: cadastro e edição com editar_clientes ou quem agenda (cliente novo no agendamento);
-- exclusão só com acoes_destrutivas, como em excluirClientePermanente.
DROP POLICY IF EXISTS "tenant gerencia clientes" ON public.clientes;
CREATE POLICY "equipe le clientes" ON public.clientes
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['editar_clientes', 'criar_agendamento', 'agendamento_manual']));
CREATE POLICY "equipe com permissao altera clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['editar_clientes', 'criar_agendamento', 'agendamento_manual']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['editar_clientes', 'criar_agendamento', 'agendamento_manual']));
CREATE POLICY "equipe com permissao remove clientes" ON public.clientes
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['acoes_destrutivas']));

-- 2) escalas_de_profissional: a tela Horários exige alterar_dados_barbearia; quem cuida da equipe também.
DROP POLICY IF EXISTS "Membros gerenciam escalas" ON public.escalas_de_profissional;
CREATE POLICY "equipe com permissao cria escalas" ON public.escalas_de_profissional
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia', 'gerenciar_profissionais']));
CREATE POLICY "equipe com permissao altera escalas" ON public.escalas_de_profissional
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia', 'gerenciar_profissionais']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia', 'gerenciar_profissionais']));
CREATE POLICY "equipe com permissao remove escalas" ON public.escalas_de_profissional
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia', 'gerenciar_profissionais']));

-- 3) bloqueios_de_agenda: "Bloquear horário" fica no menu da Agenda de toda a equipe; exige quem agenda.
DROP POLICY IF EXISTS "Membros criam bloqueios" ON public.bloqueios_de_agenda;
DROP POLICY IF EXISTS "Membros removem bloqueios" ON public.bloqueios_de_agenda;
CREATE POLICY "equipe com permissao cria bloqueios" ON public.bloqueios_de_agenda
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['criar_agendamento', 'agendamento_manual', 'alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove bloqueios" ON public.bloqueios_de_agenda
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['criar_agendamento', 'agendamento_manual', 'alterar_dados_barbearia']));

-- 4) fila_de_espera: a equipe grava pelo servidor; direto, só quem agenda.
DROP POLICY IF EXISTS "tenant gerencia fila" ON public.fila_de_espera;
CREATE POLICY "equipe le fila" ON public.fila_de_espera
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria fila" ON public.fila_de_espera
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['criar_agendamento', 'agendamento_manual']));
CREATE POLICY "equipe com permissao altera fila" ON public.fila_de_espera
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['criar_agendamento', 'agendamento_manual']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['criar_agendamento', 'agendamento_manual']));
CREATE POLICY "equipe com permissao remove fila" ON public.fila_de_espera
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['criar_agendamento', 'agendamento_manual', 'cancelar_agendamento']));

-- 5) indicacoes: mesmas permissões de registrarIndicacao/atualizarIndicacao.
DROP POLICY IF EXISTS "equipe da barbearia gerencia indicacoes" ON public.indicacoes;
CREATE POLICY "equipe le indicacoes" ON public.indicacoes
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria indicacoes" ON public.indicacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['gerenciar_profissionais', 'alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera indicacoes" ON public.indicacoes
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['gerenciar_profissionais', 'alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['gerenciar_profissionais', 'alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove indicacoes" ON public.indicacoes
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['acoes_destrutivas']));

-- 6) preferencias_do_cliente_avisos: equipe só com editar_clientes; o cliente segue com a política dele.
DROP POLICY IF EXISTS "Equipe gerencia preferencias dos clientes" ON public.preferencias_do_cliente_avisos;
CREATE POLICY "equipe le preferencias dos clientes" ON public.preferencias_do_cliente_avisos
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao grava preferencias dos clientes" ON public.preferencias_do_cliente_avisos
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['editar_clientes']));
CREATE POLICY "equipe com permissao altera preferencias dos clientes" ON public.preferencias_do_cliente_avisos
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['editar_clientes']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['editar_clientes']));
CREATE POLICY "equipe com permissao remove preferencias dos clientes" ON public.preferencias_do_cliente_avisos
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['editar_clientes']));

-- 7) onboarding_do_tenant: a implantação e o checklist só aparecem para alterar_dados_barbearia.
DROP POLICY IF EXISTS "equipe cuida do onboarding" ON public.onboarding_do_tenant;
CREATE POLICY "equipe le onboarding" ON public.onboarding_do_tenant
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria onboarding" ON public.onboarding_do_tenant
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera onboarding" ON public.onboarding_do_tenant
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
