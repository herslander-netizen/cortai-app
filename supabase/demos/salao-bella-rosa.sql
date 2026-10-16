-- Salão de exemplo "Bella Rosa Studio de Beleza" (dados fictícios), pedido do dono em 16/10/2026.
-- Para mostrar o Cortaí a clientes: segmento salão, tema Rosé Creme, equipe, serviços com fotos,
-- clientes, agenda da semana, avaliações, produtos e perguntas frequentes.
-- Dono: herslander@gmail.com. Idempotente (ON CONFLICT); não toca em nenhum outro negócio.
-- Fotos do Unsplash conferidas (HTTP 200, image/*) em 16/10/2026.
DO $$
DECLARE
  t constant uuid := 'b0a10000-0000-4000-8000-000000000001';
  dono uuid := (SELECT id FROM auth.users WHERE lower(email) = 'herslander@gmail.com');
  hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  base timestamptz := hoje::timestamp AT TIME ZONE 'America/Sao_Paulo';
  -- profissionais
  p1 constant uuid := 'b0a11000-0000-4000-8000-000000000001'; -- Camila
  p2 constant uuid := 'b0a11000-0000-4000-8000-000000000002'; -- Juliana
  p3 constant uuid := 'b0a11000-0000-4000-8000-000000000003'; -- Bruna
  p4 constant uuid := 'b0a11000-0000-4000-8000-000000000004'; -- Larissa
  -- serviços
  s1 constant uuid := 'b0a12000-0000-4000-8000-000000000001'; -- Corte feminino
  s2 constant uuid := 'b0a12000-0000-4000-8000-000000000002'; -- Escova modelada
  s3 constant uuid := 'b0a12000-0000-4000-8000-000000000003'; -- Coloração
  s4 constant uuid := 'b0a12000-0000-4000-8000-000000000004'; -- Mechas / luzes
  s5 constant uuid := 'b0a12000-0000-4000-8000-000000000005'; -- Hidratação profunda
  s6 constant uuid := 'b0a12000-0000-4000-8000-000000000006'; -- Manicure
  s7 constant uuid := 'b0a12000-0000-4000-8000-000000000007'; -- Pedicure
  s8 constant uuid := 'b0a12000-0000-4000-8000-000000000008'; -- Mãos e pés
  s9 constant uuid := 'b0a12000-0000-4000-8000-000000000009'; -- Design de sobrancelha
  s10 constant uuid := 'b0a12000-0000-4000-8000-000000000010'; -- Maquiagem social
  pagina jsonb;
BEGIN
  IF dono IS NULL THEN RAISE EXCEPTION 'conta herslander@gmail.com não encontrada'; END IF;

  INSERT INTO public.tenants (id, nome, slug, segmento, telefone, whatsapp, endereco, plano, tema, modo,
    identidade_app, ativo, listada, descricao, texto_boas_vindas, instagram, facebook, assinatura_status,
    loja_ativa, indicacao_ativa, indicacao_recompensa, assinatura_visivel, rotulo_carteira, fuso,
    capa_url, cor_primaria, cor_secundaria, cor_accent, chips_ficha, fotos)
  VALUES (t, 'Bella Rosa Studio de Beleza', 'bella-rosa', 'salao', '(11) 3456-7821', '5511934567821',
    'Rua Oscar Freire, 512 — Jardins, São Paulo/SP', 'studio', 'rose-creme', 'claro', 'rose', true, true,
    'Studio de beleza feminino com cabelo, unhas, sobrancelhas e maquiagem. Atendimento acolhedor, produtos profissionais e hora marcada sem espera.',
    'Que bom ter você aqui! Escolha seu serviço e reserve seu horário em poucos toques. 💗',
    '@bellarosastudio', 'bellarosastudio', 'ativa', true, true, 'Ganhe uma hidratação na próxima visita',
    true, 'Créditos', 'America/Sao_Paulo', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=76', '#C41F61', '#F1E4E6', '#1653A1',
    ARRAY['Cabelo cacheado','Prefere escova lisa','Alergia a amônia','Unhas curtas','Pouca conversa'],
    jsonb_build_array('https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=76','https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=900&q=76','https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=76','https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=76'))
  ON CONFLICT (id) DO UPDATE SET nome = excluded.nome, descricao = excluded.descricao, capa_url = excluded.capa_url,
    fotos = excluded.fotos, tema = excluded.tema, modo = excluded.modo;

  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
  VALUES (t, dono, 'dono', public.permissoes_padrao('dono'), true)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  -- Terça a sábado 9h–19h (sábado até 17h), almoço 12h–13h; domingo e segunda fechado.
  INSERT INTO public.horarios_de_funcionamento (tenant_id, dia_semana, fechado, abre, fecha, intervalo_inicio, intervalo_fim)
  SELECT t, d, d IN (0, 1), '09:00', CASE WHEN d = 6 THEN '17:00'::time ELSE '19:00'::time END, '12:00', '13:00'
  FROM generate_series(0, 6) d
  ON CONFLICT DO NOTHING;

  INSERT INTO public.profissionais (id, tenant_id, nome, ativo, descricao, avatar_url) VALUES
    (p1, t, 'Camila Duarte', true, 'Cabeleireira e colorista. Especialista em loiros, mechas e cortes modernos.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=75'),
    (p2, t, 'Juliana Prado', true, 'Cabeleireira. Escovas, tratamentos capilares e cachos.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=75'),
    (p3, t, 'Bruna Carvalho', true, 'Manicure e pedicure. Esmaltação em gel e nail art.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=75'),
    (p4, t, 'Larissa Mendes', true, 'Designer de sobrancelhas e maquiadora.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=75')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.servicos (id, tenant_id, nome, categoria, duracao_min, preco_centavos, ativo, ordem, comissao_percentual, retorno_dias, profissional_ids, foto_url) VALUES
    (s1, t, 'Corte feminino', 'Cabelo', 60, 9000, true, 1, 45, 45, ARRAY[p1,p2], 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=76'),
    (s2, t, 'Escova modelada', 'Cabelo', 45, 6000, true, 2, 40, NULL, ARRAY[p1,p2], 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=76'),
    (s3, t, 'Coloração', 'Química', 120, 18000, true, 3, 35, 35, ARRAY[p1], 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=76'),
    (s4, t, 'Mechas / luzes', 'Química', 180, 32000, true, 4, 35, 60, ARRAY[p1], 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=76'),
    (s5, t, 'Hidratação profunda', 'Cabelo', 60, 8500, true, 5, 40, 30, ARRAY[p2], 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=76'),
    (s6, t, 'Manicure', 'Unhas', 45, 4000, true, 6, 50, 15, ARRAY[p3], 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=76'),
    (s7, t, 'Pedicure', 'Unhas', 50, 4500, true, 7, 50, 21, ARRAY[p3], 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=76'),
    (s8, t, 'Mãos e pés', 'Combo', 90, 7900, true, 8, 50, 15, ARRAY[p3], 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=76'),
    (s9, t, 'Design de sobrancelha', 'Sobrancelha e cílios', 30, 4500, true, 9, 50, 20, ARRAY[p4], 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=76'),
    (s10, t, 'Maquiagem social', 'Estética', 60, 15000, true, 10, 45, NULL, ARRAY[p4], 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=76')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.clientes (id, tenant_id, nome, telefone, opt_in_whatsapp, opt_in_em, fidelidade_participa, origem, ficha_tecnica, ficha_chips) VALUES
    ('b0a13000-0000-4000-8000-000000000001', t, 'Ana Beatriz Lima', '5511981230001', true, now() - interval '120 days', true, 'link_publico', 'Loiro mel, tonalizante 9.1 a cada 35 dias. Prefere a Camila.', ARRAY['Prefere escova lisa']),
    ('b0a13000-0000-4000-8000-000000000002', t, 'Fernanda Rocha', '5511981230002', true, now() - interval '90 days', true, 'app', 'Cabelo cacheado tipo 3B. Nada de escova.', ARRAY['Cabelo cacheado']),
    ('b0a13000-0000-4000-8000-000000000003', t, 'Patrícia Gomes', '5511981230003', true, now() - interval '60 days', true, 'manual', 'Alergia a amônia: usar coloração sem amônia.', ARRAY['Alergia a amônia']),
    ('b0a13000-0000-4000-8000-000000000004', t, 'Mariana Alves', '5511981230004', true, now() - interval '45 days', true, 'link_publico', 'Unhas curtas, esmalte nude.', ARRAY['Unhas curtas']),
    ('b0a13000-0000-4000-8000-000000000005', t, 'Gabriela Souza', '5511981230005', true, now() - interval '30 days', false, 'instagram', 'Sobrancelha com henna a cada 20 dias.', ARRAY[]::text[]),
    ('b0a13000-0000-4000-8000-000000000006', t, 'Letícia Martins', '5511981230006', true, now() - interval '20 days', true, 'whatsapp', 'Noiva em dezembro: teste de maquiagem marcado.', ARRAY['Pouca conversa']),
    ('b0a13000-0000-4000-8000-000000000007', t, 'Renata Oliveira', '5511981230007', true, now() - interval '200 days', true, 'manual', 'Cliente desde a inauguração. Mãos e pés toda semana.', ARRAY[]::text[]),
    ('b0a13000-0000-4000-8000-000000000008', t, 'Carolina Teixeira', '5511981230008', true, now() - interval '15 days', true, 'link_publico', NULL, ARRAY[]::text[]),
    ('b0a13000-0000-4000-8000-000000000009', t, 'Isabela Ferreira', '5511981230009', true, now() - interval '75 days', true, 'app', 'Mechas finas, morena iluminada.', ARRAY[]::text[]),
    ('b0a13000-0000-4000-8000-000000000010', t, 'Vanessa Ribeiro', '5511981230010', true, now() - interval '10 days', false, 'instagram', NULL, ARRAY[]::text[])
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.carteiras (tenant_id, cliente_id, saldo_creditos, fidelidade_progresso)
  SELECT t, c.id, 0, (row_number() OVER (ORDER BY c.nome))::int % 8
  FROM public.clientes c WHERE c.tenant_id = t
  ON CONFLICT DO NOTHING;

  -- Agenda: atendimentos passados (finalizados) e a semana atual/próxima.
  INSERT INTO public.agendamentos (id, tenant_id, cliente_id, profissional_id, servico_id, inicio, fim, status, forma_pagamento, valor_centavos, origem, confirmado_em) VALUES
    ('b0a15000-0000-4000-8000-000000000001', t, 'b0a13000-0000-4000-8000-000000000001', p1, s3, base - interval '20 days' + interval '10 hours', base - interval '20 days' + interval '12 hours', 'finalizado', 'pix', 18000, 'link_publico', base - interval '21 days'),
    ('b0a15000-0000-4000-8000-000000000002', t, 'b0a13000-0000-4000-8000-000000000007', p3, s8, base - interval '7 days' + interval '9 hours', base - interval '7 days' + interval '10 hours 30 minutes', 'finalizado', 'balcao', 7900, 'manual', base - interval '8 days'),
    ('b0a15000-0000-4000-8000-000000000003', t, 'b0a13000-0000-4000-8000-000000000002', p2, s5, base - interval '5 days' + interval '14 hours', base - interval '5 days' + interval '15 hours', 'finalizado', 'pix', 8500, 'app', base - interval '6 days'),
    ('b0a15000-0000-4000-8000-000000000004', t, 'b0a13000-0000-4000-8000-000000000005', p4, s9, base - interval '3 days' + interval '16 hours', base - interval '3 days' + interval '16 hours 30 minutes', 'finalizado', 'pix', 4500, 'instagram', base - interval '4 days'),
    ('b0a15000-0000-4000-8000-000000000005', t, 'b0a13000-0000-4000-8000-000000000009', p1, s4, base + interval '1 day' + interval '9 hours', base + interval '1 day' + interval '12 hours', 'agendado', 'balcao', 32000, 'link_publico', base),
    ('b0a15000-0000-4000-8000-000000000006', t, 'b0a13000-0000-4000-8000-000000000004', p3, s6, base + interval '1 day' + interval '10 hours', base + interval '1 day' + interval '10 hours 45 minutes', 'agendado', 'pix', 4000, 'app', NULL),
    ('b0a15000-0000-4000-8000-000000000007', t, 'b0a13000-0000-4000-8000-000000000001', p2, s2, base + interval '1 day' + interval '14 hours', base + interval '1 day' + interval '14 hours 45 minutes', 'agendado', 'balcao', 6000, 'link_publico', base),
    ('b0a15000-0000-4000-8000-000000000008', t, 'b0a13000-0000-4000-8000-000000000006', p4, s10, base + interval '2 days' + interval '15 hours', base + interval '2 days' + interval '16 hours', 'agendado', 'pix', 15000, 'whatsapp', base),
    ('b0a15000-0000-4000-8000-000000000009', t, 'b0a13000-0000-4000-8000-000000000003', p1, s3, base + interval '2 days' + interval '9 hours', base + interval '2 days' + interval '11 hours', 'agendado', 'balcao', 18000, 'manual', NULL),
    ('b0a15000-0000-4000-8000-000000000010', t, 'b0a13000-0000-4000-8000-000000000007', p3, s8, base + interval '3 days' + interval '9 hours', base + interval '3 days' + interval '10 hours 30 minutes', 'agendado', 'balcao', 7900, 'manual', base),
    ('b0a15000-0000-4000-8000-000000000011', t, 'b0a13000-0000-4000-8000-000000000008', p2, s1, base + interval '3 days' + interval '16 hours', base + interval '3 days' + interval '17 hours', 'agendado', 'pix', 9000, 'link_publico', NULL),
    ('b0a15000-0000-4000-8000-000000000012', t, 'b0a13000-0000-4000-8000-000000000010', p4, s9, base + interval '4 days' + interval '11 hours', base + interval '4 days' + interval '11 hours 30 minutes', 'agendado', 'pix', 4500, 'instagram', NULL)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.avaliacoes (id, tenant_id, agendamento_id, cliente_id, profissional_id, nota, comentario, convite_publico_enviado, criado_em, dimensoes, sinal_atencao) VALUES
    ('b0a17000-0000-4000-8000-000000000001', t, 'b0a15000-0000-4000-8000-000000000001', 'b0a13000-0000-4000-8000-000000000001', p1, 5, 'A Camila acertou o tom do loiro de primeira. Amei!', true, base - interval '20 days' + interval '13 hours', '{"atendimento":5,"pontualidade":5,"agendamento":5,"experiencia":5}', false),
    ('b0a17000-0000-4000-8000-000000000002', t, 'b0a15000-0000-4000-8000-000000000002', 'b0a13000-0000-4000-8000-000000000007', p3, 5, 'Atendimento impecável como sempre. Ambiente lindo e cheiroso.', true, base - interval '7 days' + interval '11 hours', '{"atendimento":5,"pontualidade":5,"agendamento":5,"experiencia":5}', false),
    ('b0a17000-0000-4000-8000-000000000003', t, 'b0a15000-0000-4000-8000-000000000003', 'b0a13000-0000-4000-8000-000000000002', p2, 5, 'Finalmente um salão que entende cabelo cacheado.', true, base - interval '5 days' + interval '16 hours', '{"atendimento":5,"pontualidade":4,"agendamento":5,"experiencia":5}', false),
    ('b0a17000-0000-4000-8000-000000000004', t, 'b0a15000-0000-4000-8000-000000000004', 'b0a13000-0000-4000-8000-000000000005', p4, 4, 'Sobrancelha ficou perfeita, agendar pelo link foi muito fácil.', true, base - interval '3 days' + interval '17 hours', '{"atendimento":5,"pontualidade":4,"agendamento":5,"experiencia":4}', false)
  ON CONFLICT (agendamento_id) DO NOTHING;

  INSERT INTO public.produtos (id, tenant_id, nome, categoria, custo_centavos, preco_centavos, quantidade, estoque_minimo, ativo, controla_estoque, disponivel_venda, destaque, comissao_percentual, descricao) VALUES
    ('b0a14000-0000-4000-8000-000000000001', t, 'Máscara de hidratação 250 g', 'Tratamento', 3500, 7900, 14, 4, true, true, true, true, 10, 'Nutrição intensa para cabelos secos.'),
    ('b0a14000-0000-4000-8000-000000000002', t, 'Óleo reparador de pontas', 'Finalização', 2800, 5900, 9, 3, true, true, true, false, 10, 'Brilho e proteção térmica.'),
    ('b0a14000-0000-4000-8000-000000000003', t, 'Shampoo matizador', 'Loiros', 3200, 6900, 6, 3, true, true, true, true, 10, 'Neutraliza o amarelado dos loiros.'),
    ('b0a14000-0000-4000-8000-000000000004', t, 'Esmalte em gel — Rosé', 'Unhas', 900, 2900, 20, 5, true, true, true, false, 10, 'Duração de até 15 dias.'),
    ('b0a14000-0000-4000-8000-000000000005', t, 'Kit autocuidado Bella Rosa', 'Kits', 9000, 18900, 4, 2, true, true, true, true, 10, 'Máscara, óleo e touca térmica.')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.informacoes_da_barbearia (tenant_id, pergunta, resposta, ativo, ordem) VALUES
    (t, 'Onde fica o salão?', 'Rua Oscar Freire, 512 — Jardins, São Paulo/SP. Perto do metrô Oscar Freire.', true, 1),
    (t, 'Qual o horário de funcionamento?', 'Terça a sexta das 9h às 19h e sábado das 9h às 17h. Domingo e segunda fechado.', true, 2),
    (t, 'Quais formas de pagamento?', 'Pix, cartão de crédito e débito e dinheiro.', true, 3),
    (t, 'Vocês fazem penteado e maquiagem para noivas?', 'Sim! Fazemos teste de maquiagem e penteado com a Larissa. Agende uma avaliação.', true, 4),
    (t, 'Usam coloração sem amônia?', 'Sim, temos linha sem amônia para quem tem sensibilidade.', true, 5)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.config_atendimento_ia (tenant_id, atendimento_automatico, saudacao_ativa, mensagem_boas_vindas, tom,
    permite_confirmar, permite_cancelar, permite_remarcar, encaminhamento_humano, lembretes, responder_whatsapp,
    confirmacao_automatica, recuperacao_ativa, recuperacao_dias)
  VALUES (t, true, true, 'Oi! 💗 Aqui é a Bella, do Bella Rosa Studio. Posso te mostrar serviços, preços e horários livres.',
    'amigavel', true, true, true, true, true, false, true, true, 30)
  ON CONFLICT (tenant_id) DO NOTHING;

  INSERT INTO public.onboarding_do_tenant (tenant_id, etapa, tour_visto, concluido_em)
  VALUES (t, 'concluido', true, now())
  ON CONFLICT (tenant_id) DO NOTHING;

  pagina := jsonb_build_object('pagina', jsonb_build_object(
    'tema', 'rose-creme', 'layout', 'foto-destaque',
    'cores', jsonb_build_object('principal','#C41F61','secundaria','#F1E4E6','botao','#C41F61','fundo','#F8F2F0','texto','#1B1C1F','destaque','#1653A1'),
    'fonteTitulo', 'serif', 'fonteTexto', 'poppins', 'bordas', 'arredondado', 'densidade', 'equilibrada', 'botoes', 'solido',
    'frase', 'Beleza com carinho, do jeitinho que você merece.',
    'sobre', 'O Bella Rosa nasceu para ser o seu cantinho de cuidado. Cabelo, unhas, sobrancelhas e maquiagem com profissionais apaixonadas pelo que fazem, produtos profissionais e horário marcado sem espera.',
    'cta', 'Agendar horário',
    'componentes', jsonb_build_object('apresentacao',true,'servicos',true,'profissionais',true,'galeria',true,'avaliacoes',true,'produtos',true,'instagram',true,'localizacao',true,'horarios',true,'whatsapp',true,'cta_final',true),
    'chat', jsonb_build_object('modo','conversa','nomeRecepcao','Bella','avatarUrl',null,
      'mensagemInicial','Oi! 💗 Vou te ajudar a escolher o serviço, a profissional e o melhor horário.',
      'textoFinal','Prontinho! Seu horário no Bella Rosa está reservado. Até breve! 💗',
      'corDestaque','rosa','comemoracao',true,'salvarCalendario',true,'listaEspera',true),
    'filaDeChegada', false, 'versao', 2, 'experiencia', 'vitrine', 'botaoFixo', true,
    'redes', jsonb_build_object('tiktok','','youtube','','site','')));
  INSERT INTO public.tenant_page_configs (tenant_id, draft_config, published_config, draft_by, published_by, published_at)
  VALUES (t, pagina, pagina, dono, dono, now())
  ON CONFLICT (tenant_id) DO UPDATE SET draft_config = excluded.draft_config, published_config = excluded.published_config, published_at = now();
END $$;
