-- Testes de permissões por função. Rodam numa transação desfeita no final.
-- Cada bloco entra como um usuário (papel "authenticated" + sub do JWT) e
-- prova o que ele pode e o que ele NÃO pode ler ou alterar.
\set ON_ERROR_STOP on
BEGIN;

-- Cenário: uma barbearia, 4 pessoas, 2 profissionais, dados de hoje e de ontem.
INSERT INTO auth.users (id, email, aud, role) VALUES
 ('00000000-0000-4000-a000-000000000001','t-dono@rbac.test','authenticated','authenticated'),
 ('00000000-0000-4000-a000-000000000002','t-gerente@rbac.test','authenticated','authenticated'),
 ('00000000-0000-4000-a000-000000000003','t-barbeiro@rbac.test','authenticated','authenticated'),
 ('00000000-0000-4000-a000-000000000004','t-recepcao@rbac.test','authenticated','authenticated'),
 ('00000000-0000-4000-a000-000000000005','t-outro@rbac.test','authenticated','authenticated');

INSERT INTO public.tenants (id, nome, slug) VALUES ('00000000-0000-4000-b000-000000000001','RBAC Teste','rbac-teste-x');
INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
SELECT '00000000-0000-4000-b000-000000000001', u, p, public.permissoes_padrao(p) || ARRAY['gerenciar_plano','liberar_fiado','comissao_visualizar_todas','relatorios'], true
FROM (VALUES ('00000000-0000-4000-a000-000000000001'::uuid,'dono'),
             ('00000000-0000-4000-a000-000000000002'::uuid,'gerente'),
             ('00000000-0000-4000-a000-000000000003'::uuid,'barbeiro'),
             ('00000000-0000-4000-a000-000000000004'::uuid,'recepcao')) v(u,p);

INSERT INTO public.profissionais (id, tenant_id, nome, user_id) VALUES
 ('00000000-0000-4000-c000-000000000001','00000000-0000-4000-b000-000000000001','Barbeiro','00000000-0000-4000-a000-000000000003'),
 ('00000000-0000-4000-c000-000000000002','00000000-0000-4000-b000-000000000001','Colega',NULL);
INSERT INTO public.clientes (id, tenant_id, nome, telefone) VALUES
 ('00000000-0000-4000-d000-000000000001','00000000-0000-4000-b000-000000000001','Cliente','5511900000000');
INSERT INTO public.comandas (id, tenant_id, numero, cliente_id, aberta_por, profissional_id) VALUES
 ('00000000-0000-4000-e000-000000000001','00000000-0000-4000-b000-000000000001',99001,'00000000-0000-4000-d000-000000000001','00000000-0000-4000-a000-000000000001','00000000-0000-4000-c000-000000000001'),
 ('00000000-0000-4000-e000-000000000002','00000000-0000-4000-b000-000000000001',99002,'00000000-0000-4000-d000-000000000001','00000000-0000-4000-a000-000000000001','00000000-0000-4000-c000-000000000002');
INSERT INTO public.caixa_movimentos (tenant_id, tipo, categoria, descricao, valor_centavos, criado_por, profissional_id, criado_em) VALUES
 ('00000000-0000-4000-b000-000000000001','entrada','servico','hoje meu',1000,'00000000-0000-4000-a000-000000000001','00000000-0000-4000-c000-000000000001', now()),
 ('00000000-0000-4000-b000-000000000001','entrada','servico','hoje colega',2000,'00000000-0000-4000-a000-000000000001','00000000-0000-4000-c000-000000000002', now()),
 ('00000000-0000-4000-b000-000000000001','entrada','servico','ontem colega',3000,'00000000-0000-4000-a000-000000000001','00000000-0000-4000-c000-000000000002', now() - interval '2 days');
INSERT INTO public.comissoes (tenant_id, comanda_id, item_comanda_id, profissional_id, tipo_item, base_centavos, percentual, valor_centavos) VALUES
 ('00000000-0000-4000-b000-000000000001','00000000-0000-4000-e000-000000000001',gen_random_uuid(),'00000000-0000-4000-c000-000000000001','servico',1000,50,500),
 ('00000000-0000-4000-b000-000000000001','00000000-0000-4000-e000-000000000002',gen_random_uuid(),'00000000-0000-4000-c000-000000000002','servico',2000,50,1000);

CREATE TEMP TABLE resultados (papel text, teste text, ok boolean);
GRANT ALL ON resultados TO authenticated;

CREATE OR REPLACE FUNCTION pg_temp.checar(_papel text, _teste text, _ok boolean) RETURNS void LANGUAGE sql AS
$$ INSERT INTO resultados VALUES (_papel, _teste, _ok) $$;

-- Tenta alterar o limite de fiado e devolve se conseguiu.
CREATE OR REPLACE FUNCTION pg_temp.tenta_fiado() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.clientes SET limite_fiado_centavos = 5000 WHERE id = '00000000-0000-4000-d000-000000000001';
  RETURN FOUND;
EXCEPTION WHEN others THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.tenta_plano() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.tenants SET plano = 'essencial' WHERE id = '00000000-0000-4000-b000-000000000001';
  RETURN FOUND;
EXCEPTION WHEN others THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.tenta_excluir() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.tenants WHERE id = '00000000-0000-4000-b000-000000000001';
  RETURN FOUND;
EXCEPTION WHEN others THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.tenta_regra() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.regras_de_plano (tenant_id, tipo) VALUES ('00000000-0000-4000-b000-000000000001','teste');
  RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.tenta_equipe() RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE r jsonb;
BEGIN
  r := public.definir_acesso_membro('00000000-0000-4000-b000-000000000001','00000000-0000-4000-a000-000000000004','recepcao',public.permissoes_padrao('recepcao'),true);
  RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.tenta_barbeiro_recebe() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.definir_barbeiro_recebe('00000000-0000-4000-b000-000000000001', false);
  RETURN true;
EXCEPTION WHEN others THEN RETURN false;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated;

-- Roda o conjunto de verificações como uma pessoa
CREATE OR REPLACE FUNCTION pg_temp.como(_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub',_uid,'role','authenticated')::text, true);
$$;

-- ===== DONO =====
SELECT pg_temp.como('00000000-0000-4000-a000-000000000001');
SET LOCAL ROLE authenticated;
SELECT pg_temp.checar('dono','le todo o caixa (3)', (SELECT count(*) FROM public.caixa_movimentos WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 3);
SELECT pg_temp.checar('dono','le comissoes de todos (2)', (SELECT count(*) FROM public.comissoes WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 2);
SELECT pg_temp.checar('dono','recebe pagamento', public.has_tenant_permission('00000000-0000-4000-b000-000000000001','confirmar_pagamento'));
SELECT pg_temp.checar('dono','relatorios', public.has_tenant_permission('00000000-0000-4000-b000-000000000001','relatorios'));
SELECT pg_temp.checar('dono','altera configuracoes', pg_temp.tenta_regra());
SELECT pg_temp.checar('dono','gerencia equipe', pg_temp.tenta_equipe());
SELECT pg_temp.checar('dono','libera fiado', pg_temp.tenta_fiado());
SELECT pg_temp.checar('dono','troca plano', pg_temp.tenta_plano());
SELECT pg_temp.checar('dono','pode gerenciar plano', public.has_tenant_permission('00000000-0000-4000-b000-000000000001','gerenciar_plano'));
RESET ROLE;
UPDATE public.clientes SET limite_fiado_centavos = 0 WHERE id='00000000-0000-4000-d000-000000000001';

-- ===== GERENTE =====
SELECT pg_temp.como('00000000-0000-4000-a000-000000000002');
SET LOCAL ROLE authenticated;
SELECT pg_temp.checar('gerente','le todo o caixa (3)', (SELECT count(*) FROM public.caixa_movimentos WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 3);
SELECT pg_temp.checar('gerente','le comissoes de todos (2)', (SELECT count(*) FROM public.comissoes WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 2);
SELECT pg_temp.checar('gerente','recebe pagamento', public.has_tenant_permission('00000000-0000-4000-b000-000000000001','confirmar_pagamento'));
SELECT pg_temp.checar('gerente','relatorios', public.has_tenant_permission('00000000-0000-4000-b000-000000000001','relatorios'));
SELECT pg_temp.checar('gerente','altera configuracoes', pg_temp.tenta_regra());
SELECT pg_temp.checar('gerente','gerencia equipe', pg_temp.tenta_equipe());
SELECT pg_temp.checar('gerente','NAO libera fiado', NOT pg_temp.tenta_fiado());
SELECT pg_temp.checar('gerente','NAO troca plano', NOT pg_temp.tenta_plano());
SELECT pg_temp.checar('gerente','NAO exclui a barbearia', NOT pg_temp.tenta_excluir());
SELECT pg_temp.checar('gerente','NAO tem gerenciar_plano mesmo marcado', NOT public.has_tenant_permission('00000000-0000-4000-b000-000000000001','gerenciar_plano'));
RESET ROLE;

-- ===== RECEPCAO =====
SELECT pg_temp.como('00000000-0000-4000-a000-000000000004');
SET LOCAL ROLE authenticated;
SELECT pg_temp.checar('recepcao','le so o caixa de hoje (2)', (SELECT count(*) FROM public.caixa_movimentos WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 2);
SELECT pg_temp.checar('recepcao','NAO le comissoes', (SELECT count(*) FROM public.comissoes WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 0);
SELECT pg_temp.checar('recepcao','recebe pagamento', public.has_tenant_permission('00000000-0000-4000-b000-000000000001','confirmar_pagamento'));
SELECT pg_temp.checar('recepcao','NAO ve relatorios mesmo marcado', NOT public.has_tenant_permission('00000000-0000-4000-b000-000000000001','relatorios'));
SELECT pg_temp.checar('recepcao','NAO ve financeiro completo', NOT public.has_tenant_permission('00000000-0000-4000-b000-000000000001','visualizar_financeiro'));
SELECT pg_temp.checar('recepcao','NAO altera configuracoes', NOT pg_temp.tenta_regra());
SELECT pg_temp.checar('recepcao','NAO gerencia equipe', NOT pg_temp.tenta_equipe());
SELECT pg_temp.checar('recepcao','NAO muda regra de recebimento', NOT pg_temp.tenta_barbeiro_recebe());
SELECT pg_temp.checar('recepcao','NAO libera fiado', NOT pg_temp.tenta_fiado());
SELECT pg_temp.checar('recepcao','NAO troca plano', NOT pg_temp.tenta_plano());
SELECT pg_temp.checar('recepcao','NAO exclui a barbearia', NOT pg_temp.tenta_excluir());
RESET ROLE;

-- ===== BARBEIRO =====
SELECT pg_temp.como('00000000-0000-4000-a000-000000000003');
SET LOCAL ROLE authenticated;
SELECT pg_temp.checar('barbeiro','le so o proprio caixa (1)', (SELECT count(*) FROM public.caixa_movimentos WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 1);
SELECT pg_temp.checar('barbeiro','le so a propria comissao (1)', (SELECT count(*) FROM public.comissoes WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 1);
SELECT pg_temp.checar('barbeiro','le so a propria comanda (1)', (SELECT count(*) FROM public.comandas WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 1);
SELECT pg_temp.checar('barbeiro','NAO recebe pagamento sem liberacao', NOT public.has_tenant_permission('00000000-0000-4000-b000-000000000001','confirmar_pagamento'));
SELECT pg_temp.checar('barbeiro','NAO ve relatorios mesmo marcado', NOT public.has_tenant_permission('00000000-0000-4000-b000-000000000001','relatorios'));
SELECT pg_temp.checar('barbeiro','NAO altera configuracoes', NOT pg_temp.tenta_regra());
SELECT pg_temp.checar('barbeiro','NAO gerencia equipe', NOT pg_temp.tenta_equipe());
SELECT pg_temp.checar('barbeiro','NAO se libera para receber', NOT pg_temp.tenta_barbeiro_recebe());
SELECT pg_temp.checar('barbeiro','NAO libera fiado', NOT pg_temp.tenta_fiado());
SELECT pg_temp.checar('barbeiro','NAO troca plano', NOT pg_temp.tenta_plano());
SELECT pg_temp.checar('barbeiro','NAO exclui a barbearia', NOT pg_temp.tenta_excluir());
RESET ROLE;

-- Barbearia libera: barbeiro passa a receber
SELECT pg_temp.como('00000000-0000-4000-a000-000000000001');
SET LOCAL ROLE authenticated;
SELECT public.definir_barbeiro_recebe('00000000-0000-4000-b000-000000000001', true);
SELECT pg_temp.como('00000000-0000-4000-a000-000000000003');
SELECT pg_temp.checar('barbeiro','recebe quando a barbearia libera', public.has_tenant_permission('00000000-0000-4000-b000-000000000001','confirmar_pagamento'));
RESET ROLE;

-- ===== FORA DA BARBEARIA =====
SELECT pg_temp.como('00000000-0000-4000-a000-000000000005');
SET LOCAL ROLE authenticated;
SELECT pg_temp.checar('estranho','NAO le caixa', (SELECT count(*) FROM public.caixa_movimentos WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 0);
SELECT pg_temp.checar('estranho','NAO le comandas', (SELECT count(*) FROM public.comandas WHERE tenant_id='00000000-0000-4000-b000-000000000001') = 0);
RESET ROLE;

-- Teto: permissão proibida gravada no vínculo é descartada
SELECT pg_temp.checar('teto','barbeiro nao guarda relatorios', NOT ('relatorios' = ANY((SELECT permissoes FROM public.tenant_usuarios WHERE user_id='00000000-0000-4000-a000-000000000003'))));
SELECT pg_temp.checar('teto','gerente nao guarda liberar_fiado', NOT ('liberar_fiado' = ANY((SELECT permissoes FROM public.tenant_usuarios WHERE user_id='00000000-0000-4000-a000-000000000002'))));

\pset format unaligned
\pset tuples_only on
SELECT (CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END) || ' | ' || papel || ' | ' || teste FROM resultados;

ROLLBACK;
