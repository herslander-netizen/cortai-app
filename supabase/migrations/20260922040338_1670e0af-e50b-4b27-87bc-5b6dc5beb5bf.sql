-- Barbearia de demonstração: tenant isolado, dados 100% fictícios.
insert into public.tenants (
  id, nome, slug, telefone, whatsapp, endereco, plano, tema, modo, ativo,
  descricao, texto_boas_vindas, instagram, assinatura_status, loja_ativa,
  indicacao_ativa, assinatura_visivel, rotulo_carteira
) values (
  '0de00000-0000-4000-8000-000000000001',
  'Barbearia Cortaí — Demonstração',
  'demonstracao',
  '(11) 4002-8922',
  '11400289220',
  'Rua das Tesouras, 120 — Vila Fictícia, São Paulo/SP',
  'studio', 'classica', 'auto', true,
  'Barbearia fictícia criada para demonstrar o Cortaí. Nenhum dado aqui é real.',
  'Bem-vindo à barbearia de demonstração do Cortaí.',
  '@cortai.demo', 'ativa', true, true, true, 'Créditos'
) on conflict (id) do update set nome = excluded.nome, descricao = excluded.descricao;

-- Funcionamento: segunda a sábado.
insert into public.horarios_de_funcionamento (tenant_id, dia_semana, fechado, abre, fecha)
select '0de00000-0000-4000-8000-000000000001', d,
       d = 0,
       '09:00'::time,
       case when d = 6 then '17:00'::time else '20:00'::time end
from generate_series(0, 6) as d
on conflict do nothing;

-- Equipe fictícia.
insert into public.profissionais (id, tenant_id, nome, ativo, descricao) values
  ('0de01000-0000-4000-8000-000000000001', '0de00000-0000-4000-8000-000000000001', 'Rafael Lima', true, 'Barbeiro clássico, especialista em navalha.'),
  ('0de01000-0000-4000-8000-000000000002', '0de00000-0000-4000-8000-000000000001', 'Diego Martins', true, 'Degradê, freestyle e desenho.'),
  ('0de01000-0000-4000-8000-000000000003', '0de00000-0000-4000-8000-000000000001', 'Caio Ferreira', true, 'Barba terapêutica e tratamentos.'),
  ('0de01000-0000-4000-8000-000000000004', '0de00000-0000-4000-8000-000000000001', 'Bruno Alves', true, 'Cortes infantis e sociais.')
on conflict (id) do nothing;

-- Serviços e preços fictícios.
insert into public.servicos (id, tenant_id, nome, duracao_min, preco_centavos, ativo, ordem, comissao_percentual) values
  ('0de02000-0000-4000-8000-000000000001', '0de00000-0000-4000-8000-000000000001', 'Corte masculino', 40, 5000, true, 1, 50),
  ('0de02000-0000-4000-8000-000000000002', '0de00000-0000-4000-8000-000000000001', 'Barba na navalha', 30, 4000, true, 2, 50),
  ('0de02000-0000-4000-8000-000000000003', '0de00000-0000-4000-8000-000000000001', 'Corte + barba', 70, 8000, true, 3, 50),
  ('0de02000-0000-4000-8000-000000000004', '0de00000-0000-4000-8000-000000000001', 'Degradê navalhado', 45, 6000, true, 4, 50),
  ('0de02000-0000-4000-8000-000000000005', '0de00000-0000-4000-8000-000000000001', 'Corte infantil', 30, 4000, true, 5, 45),
  ('0de02000-0000-4000-8000-000000000006', '0de00000-0000-4000-8000-000000000001', 'Pigmentação de barba', 40, 7000, true, 6, 50)
on conflict (id) do nothing;

-- Clientes fictícios, alguns recorrentes.
insert into public.clientes (id, tenant_id, nome, telefone, opt_in_whatsapp, fidelidade_participa, origem, ficha_tecnica) values
  ('0de03000-0000-4000-8000-000000000001', '0de00000-0000-4000-8000-000000000001', 'André Souza', '11911110001', true, true, 'manual', 'Máquina 2 nas laterais, topo na tesoura.'),
  ('0de03000-0000-4000-8000-000000000002', '0de00000-0000-4000-8000-000000000001', 'Marcelo Dias', '11911110002', true, true, 'app', 'Barba alinhada, sem pigmentação.'),
  ('0de03000-0000-4000-8000-000000000003', '0de00000-0000-4000-8000-000000000001', 'Thiago Rocha', '11911110003', true, false, 'app', null),
  ('0de03000-0000-4000-8000-000000000004', '0de00000-0000-4000-8000-000000000001', 'Felipe Nunes', '11911110004', true, true, 'manual', 'Gosta de degradê alto.'),
  ('0de03000-0000-4000-8000-000000000005', '0de00000-0000-4000-8000-000000000001', 'Rodrigo Prado', '11911110005', false, false, 'manual', null),
  ('0de03000-0000-4000-8000-000000000006', '0de00000-0000-4000-8000-000000000001', 'Lucas Medeiros', '11911110006', true, true, 'app', 'Sempre traz o filho no sábado.'),
  ('0de03000-0000-4000-8000-000000000007', '0de00000-0000-4000-8000-000000000001', 'Paulo Henrique', '11911110007', true, false, 'app', null),
  ('0de03000-0000-4000-8000-000000000008', '0de00000-0000-4000-8000-000000000001', 'Gustavo Reis', '11911110008', true, true, 'manual', 'Barba cheia, pigmentação leve.')
on conflict (id) do nothing;

-- Fidelidade em andamento.
insert into public.carteiras (tenant_id, cliente_id, saldo_creditos, fidelidade_progresso)
select '0de00000-0000-4000-8000-000000000001', c.id,
       (row_number() over (order by c.nome))::int % 3,
       ((row_number() over (order by c.nome))::int * 2) % 10
from public.clientes c
where c.tenant_id = '0de00000-0000-4000-8000-000000000001'
on conflict do nothing;

-- Produtos e estoque.
insert into public.produtos (id, tenant_id, nome, categoria, custo_centavos, preco_centavos, quantidade, estoque_minimo, ativo, controla_estoque, disponivel_venda, destaque, comissao_percentual, descricao) values
  ('0de04000-0000-4000-8000-000000000001', '0de00000-0000-4000-8000-000000000001', 'Pomada modeladora matte', 'Finalizadores', 1800, 3900, 24, 5, true, true, true, true, 10, 'Fixação forte com brilho natural.'),
  ('0de04000-0000-4000-8000-000000000002', '0de00000-0000-4000-8000-000000000001', 'Óleo para barba', 'Barba', 1500, 3500, 12, 4, true, true, true, false, 10, 'Hidrata e perfuma.'),
  ('0de04000-0000-4000-8000-000000000003', '0de00000-0000-4000-8000-000000000001', 'Shampoo anticaspa', 'Cabelo', 1200, 2900, 8, 6, true, true, true, false, 10, 'Uso diário.'),
  ('0de04000-0000-4000-8000-000000000004', '0de00000-0000-4000-8000-000000000001', 'Balm pós-barba', 'Barba', 1400, 3200, 3, 5, true, true, true, false, 10, 'Acalma a pele após a navalha.'),
  ('0de04000-0000-4000-8000-000000000005', '0de00000-0000-4000-8000-000000000001', 'Kit presente barbearia', 'Kits', 5400, 11900, 6, 2, true, true, true, true, 10, 'Pomada, óleo e pente.')
on conflict (id) do nothing;

-- Perguntas frequentes usadas pelo CortAI.
insert into public.informacoes_da_barbearia (tenant_id, pergunta, resposta, ativo, ordem) values
  ('0de00000-0000-4000-8000-000000000001', 'Onde fica a barbearia?', 'Rua das Tesouras, 120 — Vila Fictícia, São Paulo/SP. Endereço fictício de demonstração.', true, 1),
  ('0de00000-0000-4000-8000-000000000001', 'Precisa agendar?', 'Atendemos com hora marcada e também por ordem de chegada quando há espaço na agenda.', true, 2),
  ('0de00000-0000-4000-8000-000000000001', 'Quais formas de pagamento?', 'Pix, dinheiro e cartão. Também temos fiado para clientes cadastrados.', true, 3),
  ('0de00000-0000-4000-8000-000000000001', 'Tem estacionamento?', 'Sim, convênio com o estacionamento ao lado.', true, 4)
on conflict do nothing;

-- Atendimento automático ligado.
insert into public.config_atendimento_ia (
  tenant_id, atendimento_automatico, saudacao_ativa, mensagem_boas_vindas, tom,
  permite_confirmar, permite_cancelar, permite_remarcar, encaminhamento_humano, lembretes, responder_whatsapp
) values (
  '0de00000-0000-4000-8000-000000000001', true, true,
  'Olá! 👋 Sou o CortAI da Barbearia Cortaí (demonstração). Posso mostrar serviços, preços e horários.',
  'profissional', true, true, true, true, true, false
) on conflict (tenant_id) do nothing;

-- Onboarding concluído: a demonstração já nasce configurada.
insert into public.onboarding_do_tenant (tenant_id, etapa, tour_visto, concluido_em)
values ('0de00000-0000-4000-8000-000000000001', 'concluido', true, now())
on conflict (tenant_id) do nothing;