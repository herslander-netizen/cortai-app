DO $$
DECLARE
  v_tenant constant uuid := '0de00000-0000-4000-8000-000000000001';
  v_usuario constant uuid := '5c46438a-03f3-45be-b66f-59fb3d82281b';
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_base timestamptz := v_hoje::timestamp AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant AND slug = 'demonstracao') THEN
    RAISE EXCEPTION 'Tenant de demonstração não encontrado';
  END IF;

  UPDATE public.tenants SET
    nome = 'Aurora Barbearia Premium',
    segmento = 'barbearia',
    descricao = 'Barbearia premium de demonstração do Cortaí, com atendimento personalizado, pontualidade e cuidado em cada detalhe.',
    endereco = 'Alameda Aurora, 128 — Jardins, São Paulo/SP',
    telefone = '(11) 4002-8922',
    whatsapp = '551140028922',
    instagram = '@aurorabarbearia.demo',
    facebook = 'aurorabarbearia.demo',
    texto_boas_vindas = 'Bem-vindo à Aurora. Escolha seu serviço e encontre o melhor horário.',
    capa_url = 'https://cortai.dev/__l5e/assets-v1/f440c2ba-6cf8-4c48-bacb-3e259681dba5/cortai-barbershop-cover.jpg',
    logo_url = 'https://cortai.dev/__l5e/assets-v1/2d535ce1-7944-40b6-8a25-18a0166a54fe/cortai-logo-light-bg.jpg',
    fuso = 'America/Sao_Paulo',
    ativo = true
  WHERE id = v_tenant;

  UPDATE public.profissionais SET
    nome = CASE id
      WHEN '0de01000-0000-4000-8000-000000000001' THEN 'Lucas Almeida'
      WHEN '0de01000-0000-4000-8000-000000000002' THEN 'Rafael Martins'
      WHEN '0de01000-0000-4000-8000-000000000003' THEN 'João Pedro'
      ELSE nome END,
    descricao = CASE id
      WHEN '0de01000-0000-4000-8000-000000000001' THEN 'Especialista em degradê, acabamento e cortes modernos.'
      WHEN '0de01000-0000-4000-8000-000000000002' THEN 'Especialista em barba na navalha e cuidados clássicos.'
      WHEN '0de01000-0000-4000-8000-000000000003' THEN 'Especialista em cortes sociais, combos e sobrancelha.'
      ELSE descricao END,
    avatar_url = CASE id
      WHEN '0de01000-0000-4000-8000-000000000001' THEN 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=75'
      WHEN '0de01000-0000-4000-8000-000000000002' THEN 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=75'
      WHEN '0de01000-0000-4000-8000-000000000003' THEN 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75'
      ELSE avatar_url END,
    ativo = id <> '0de01000-0000-4000-8000-000000000004'
  WHERE tenant_id = v_tenant;

  UPDATE public.servicos SET
    nome = CASE id
      WHEN '0de02000-0000-4000-8000-000000000001' THEN 'Corte Masculino'
      WHEN '0de02000-0000-4000-8000-000000000002' THEN 'Corte + Barba'
      WHEN '0de02000-0000-4000-8000-000000000003' THEN 'Barba'
      WHEN '0de02000-0000-4000-8000-000000000004' THEN 'Degradê'
      WHEN '0de02000-0000-4000-8000-000000000005' THEN 'Sobrancelha'
      WHEN '0de02000-0000-4000-8000-000000000006' THEN 'Experiência Premium'
      ELSE nome END,
    duracao_min = CASE id
      WHEN '0de02000-0000-4000-8000-000000000001' THEN 40
      WHEN '0de02000-0000-4000-8000-000000000002' THEN 70
      WHEN '0de02000-0000-4000-8000-000000000003' THEN 35
      WHEN '0de02000-0000-4000-8000-000000000004' THEN 45
      WHEN '0de02000-0000-4000-8000-000000000005' THEN 15
      WHEN '0de02000-0000-4000-8000-000000000006' THEN 90
      ELSE duracao_min END,
    preco_centavos = CASE id
      WHEN '0de02000-0000-4000-8000-000000000001' THEN 5500
      WHEN '0de02000-0000-4000-8000-000000000002' THEN 9000
      WHEN '0de02000-0000-4000-8000-000000000003' THEN 4500
      WHEN '0de02000-0000-4000-8000-000000000004' THEN 6500
      WHEN '0de02000-0000-4000-8000-000000000005' THEN 2000
      WHEN '0de02000-0000-4000-8000-000000000006' THEN 13000
      ELSE preco_centavos END,
    ordem = CASE id
      WHEN '0de02000-0000-4000-8000-000000000001' THEN 1
      WHEN '0de02000-0000-4000-8000-000000000002' THEN 2
      WHEN '0de02000-0000-4000-8000-000000000003' THEN 3
      WHEN '0de02000-0000-4000-8000-000000000004' THEN 4
      WHEN '0de02000-0000-4000-8000-000000000005' THEN 5
      WHEN '0de02000-0000-4000-8000-000000000006' THEN 6
      ELSE ordem END,
    profissional_ids = CASE id
      WHEN '0de02000-0000-4000-8000-000000000001' THEN ARRAY['0de01000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000003']::uuid[]
      WHEN '0de02000-0000-4000-8000-000000000002' THEN ARRAY['0de01000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000002']::uuid[]
      WHEN '0de02000-0000-4000-8000-000000000003' THEN ARRAY['0de01000-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000003']::uuid[]
      WHEN '0de02000-0000-4000-8000-000000000004' THEN ARRAY['0de01000-0000-4000-8000-000000000001']::uuid[]
      WHEN '0de02000-0000-4000-8000-000000000005' THEN ARRAY['0de01000-0000-4000-8000-000000000003']::uuid[]
      WHEN '0de02000-0000-4000-8000-000000000006' THEN ARRAY['0de01000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000002']::uuid[]
      ELSE profissional_ids END,
    foto_url = CASE id
      WHEN '0de02000-0000-4000-8000-000000000001' THEN 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=76'
      WHEN '0de02000-0000-4000-8000-000000000002' THEN 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=76'
      WHEN '0de02000-0000-4000-8000-000000000003' THEN 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=76'
      WHEN '0de02000-0000-4000-8000-000000000004' THEN 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=76'
      WHEN '0de02000-0000-4000-8000-000000000005' THEN 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=76'
      WHEN '0de02000-0000-4000-8000-000000000006' THEN 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=76'
      ELSE foto_url END,
    ativo = true
  WHERE tenant_id = v_tenant;

  UPDATE public.clientes SET arquivado_em = COALESCE(arquivado_em, now())
  WHERE tenant_id = v_tenant
    AND id NOT IN ('0de03000-0000-4000-8000-000000000001','0de03000-0000-4000-8000-000000000002');

  UPDATE public.clientes SET
    nome = CASE id WHEN '0de03000-0000-4000-8000-000000000001' THEN 'André Souza' ELSE 'Marina Costa' END,
    telefone = CASE id WHEN '0de03000-0000-4000-8000-000000000001' THEN '5511911110001' ELSE '5511911110002' END,
    opt_in_whatsapp = true,
    opt_in_em = COALESCE(opt_in_em, now() - interval '90 days'),
    fidelidade_participa = true,
    origem = CASE id WHEN '0de03000-0000-4000-8000-000000000001' THEN 'manual' ELSE 'link_publico' END,
    ficha_tecnica = CASE id
      WHEN '0de03000-0000-4000-8000-000000000001' THEN 'Cliente fiel. Prefere degradê baixo, topo na tesoura e acabamento natural. Retorno médio em 25 dias.'
      ELSE 'Cliente recente. Prefere corte clássico e atendimento no início da tarde.' END,
    arquivado_em = NULL
  WHERE tenant_id = v_tenant
    AND id IN ('0de03000-0000-4000-8000-000000000001','0de03000-0000-4000-8000-000000000002');

  INSERT INTO public.agendamentos (id,tenant_id,cliente_id,profissional_id,servico_id,inicio,fim,status,forma_pagamento,valor_centavos,origem,pagamento_confirmado_em,arrived_at,started_at,finished_at,confirmado_em,cancelado_em)
  VALUES
    ('0de05000-0000-4000-8000-000000000001',v_tenant,'0de03000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000001','0de02000-0000-4000-8000-000000000004',v_base-interval '28 days'+interval '14 hours',v_base-interval '28 days'+interval '14 hours 45 minutes','finalizado','pix',6500,'manual',v_base-interval '28 days'+interval '14 hours 46 minutes',v_base-interval '28 days'+interval '13 hours 55 minutes',v_base-interval '28 days'+interval '14 hours',v_base-interval '28 days'+interval '14 hours 45 minutes',v_base-interval '29 days',NULL),
    ('0de05000-0000-4000-8000-000000000002',v_tenant,'0de03000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000002','0de02000-0000-4000-8000-000000000002',v_base-interval '7 days'+interval '11 hours',v_base-interval '7 days'+interval '12 hours 10 minutes','finalizado','credito',9000,'app',v_base-interval '7 days'+interval '12 hours 12 minutes',v_base-interval '7 days'+interval '10 hours 55 minutes',v_base-interval '7 days'+interval '11 hours',v_base-interval '7 days'+interval '12 hours 10 minutes',v_base-interval '8 days',NULL),
    ('0de05000-0000-4000-8000-000000000003',v_tenant,'0de03000-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000003','0de02000-0000-4000-8000-000000000001',v_base-interval '3 days'+interval '15 hours',v_base-interval '3 days'+interval '15 hours 40 minutes','finalizado','balcao',5500,'link_publico',v_base-interval '3 days'+interval '15 hours 42 minutes',v_base-interval '3 days'+interval '14 hours 58 minutes',v_base-interval '3 days'+interval '15 hours',v_base-interval '3 days'+interval '15 hours 40 minutes',v_base-interval '4 days',NULL),
    ('0de05000-0000-4000-8000-000000000004',v_tenant,'0de03000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000001','0de02000-0000-4000-8000-000000000004',v_base+interval '10 hours',v_base+interval '10 hours 45 minutes','confirmado','balcao',6500,'app',NULL,NULL,NULL,NULL,v_base-interval '1 day',NULL),
    ('0de05000-0000-4000-8000-000000000005',v_tenant,'0de03000-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000003','0de02000-0000-4000-8000-000000000001',v_base+interval '14 hours',v_base+interval '14 hours 40 minutes','agendado','balcao',5500,'link_publico',NULL,NULL,NULL,NULL,NULL,NULL),
    ('0de05000-0000-4000-8000-000000000006',v_tenant,'0de03000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000002','0de02000-0000-4000-8000-000000000006',v_base+interval '2 days 15 hours',v_base+interval '2 days 16 hours 30 minutes','agendado','balcao',13000,'app',NULL,NULL,NULL,NULL,v_base,NULL),
    ('0de05000-0000-4000-8000-000000000007',v_tenant,'0de03000-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000001','0de02000-0000-4000-8000-000000000004',v_base-interval '1 day'+interval '17 hours',v_base-interval '1 day'+interval '17 hours 45 minutes','cancelado','balcao',6500,'app',NULL,NULL,NULL,NULL,NULL,v_base-interval '2 days'+interval '9 hours')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.fila_de_espera (id,tenant_id,cliente_id,profissional_id,servico_id,janela_preferida,posicao,status,origem,token_publico)
  VALUES ('0de06000-0000-4000-8000-000000000001',v_tenant,'0de03000-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000001','0de02000-0000-4000-8000-000000000004',jsonb_build_object('periodo','tarde','dias',jsonb_build_array(v_hoje+1,v_hoje+2)),1,'aguardando','painel','demo-aurora-fila-001')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.avaliacoes (id,tenant_id,agendamento_id,cliente_id,profissional_id,nota,comentario,convite_publico_enviado,criado_em,dimensoes,sinal_atencao)
  VALUES
    ('0de07000-0000-4000-8000-000000000001',v_tenant,'0de05000-0000-4000-8000-000000000002','0de03000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000002',5,'Atendimento pontual e acabamento impecável.',true,v_base-interval '7 days'+interval '13 hours','{"atendimento":5,"pontualidade":5,"agendamento":5,"experiencia":5}'::jsonb,false),
    ('0de07000-0000-4000-8000-000000000002',v_tenant,'0de05000-0000-4000-8000-000000000003','0de03000-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000003',4,'Gostei da facilidade para agendar e fui muito bem recebida.',false,v_base-interval '3 days'+interval '17 hours','{"atendimento":5,"pontualidade":4,"agendamento":5,"experiencia":4}'::jsonb,false)
  ON CONFLICT (agendamento_id) DO NOTHING;

  INSERT INTO public.comandas (id,tenant_id,numero,cliente_id,profissional_id,agendamento_id,status,subtotal_centavos,desconto_centavos,total_centavos,comissao_total_centavos,aberta_por,finalizada_por,criado_em,atualizado_em,finalizada_em)
  VALUES
    ('0de08000-0000-4000-8000-000000000001',v_tenant,9001,'0de03000-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000002','0de05000-0000-4000-8000-000000000002','paga',9000,0,9000,4500,v_usuario,v_usuario,v_base-interval '7 days'+interval '10 hours 55 minutes',v_base-interval '7 days'+interval '12 hours 12 minutes',v_base-interval '7 days'+interval '12 hours 12 minutes'),
    ('0de08000-0000-4000-8000-000000000002',v_tenant,9002,'0de03000-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000003','0de05000-0000-4000-8000-000000000003','paga',5500,0,5500,2750,v_usuario,v_usuario,v_base-interval '3 days'+interval '14 hours 58 minutes',v_base-interval '3 days'+interval '15 hours 42 minutes',v_base-interval '3 days'+interval '15 hours 42 minutes')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.comanda_itens (id,comanda_id,tipo,servico_id,descricao,quantidade,valor_unitario_centavos,valor_total_centavos,comissao_percentual,comissao_centavos,criado_em)
  VALUES
    ('0de08100-0000-4000-8000-000000000001','0de08000-0000-4000-8000-000000000001','servico','0de02000-0000-4000-8000-000000000002','Corte + Barba',1,9000,9000,50,4500,v_base-interval '7 days'+interval '11 hours'),
    ('0de08100-0000-4000-8000-000000000002','0de08000-0000-4000-8000-000000000002','servico','0de02000-0000-4000-8000-000000000001','Corte Masculino',1,5500,5500,50,2750,v_base-interval '3 days'+interval '15 hours')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pagamentos (id,tenant_id,comanda_id,forma_pagamento,valor_centavos,status,criado_por,confirmado_por,criado_em,confirmado_em)
  VALUES
    ('0de08200-0000-4000-8000-000000000001',v_tenant,'0de08000-0000-4000-8000-000000000001','pix',9000,'confirmado',v_usuario,v_usuario,v_base-interval '7 days'+interval '12 hours 10 minutes',v_base-interval '7 days'+interval '12 hours 12 minutes'),
    ('0de08200-0000-4000-8000-000000000002',v_tenant,'0de08000-0000-4000-8000-000000000002','cartao',5500,'confirmado',v_usuario,v_usuario,v_base-interval '3 days'+interval '15 hours 40 minutes',v_base-interval '3 days'+interval '15 hours 42 minutes')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.comissoes (id,tenant_id,comanda_id,item_comanda_id,profissional_id,tipo_item,base_centavos,percentual,valor_centavos,status,criado_em)
  VALUES
    ('0de08300-0000-4000-8000-000000000001',v_tenant,'0de08000-0000-4000-8000-000000000001','0de08100-0000-4000-8000-000000000001','0de01000-0000-4000-8000-000000000002','servico',9000,50,4500,'pendente',v_base-interval '7 days'+interval '12 hours 12 minutes'),
    ('0de08300-0000-4000-8000-000000000002',v_tenant,'0de08000-0000-4000-8000-000000000002','0de08100-0000-4000-8000-000000000002','0de01000-0000-4000-8000-000000000003','servico',5500,50,2750,'pendente',v_base-interval '3 days'+interval '15 hours 42 minutes')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.envios_de_whatsapp (id,tenant_id,agendamento_id,cliente_id,telefone,tipo,status,tentativas,conteudo,enviado_em,criado_em,atualizado_em,canal,aguarda_resposta,acoes,valido_ate,respondido_em,mensagem_externa_id,resposta)
  VALUES
    ('0de09000-0000-4000-8000-000000000001',v_tenant,'0de05000-0000-4000-8000-000000000004','0de03000-0000-4000-8000-000000000001','5511911110001','confirmacao_agendamento','enviado',1,'André, seu horário na Aurora está confirmado para hoje às 10h.',v_base-interval '1 day'+interval '9 hours',v_base-interval '1 day'+interval '9 hours',v_base-interval '1 day'+interval '9 hours','whatsapp',true,ARRAY['confirmar','remarcar','cancelar'],v_base+interval '9 hours','2026-09-29 12:05:00+00','demo-confirmacao-001','confirmar'),
    ('0de09000-0000-4000-8000-000000000002',v_tenant,'0de05000-0000-4000-8000-000000000005','0de03000-0000-4000-8000-000000000002','5511911110002','lembrete_24h','enviado',1,'Marina, lembrando do seu atendimento amanhã às 14h na Aurora.',v_base-interval '10 hours',v_base-interval '10 hours',v_base-interval '10 hours','whatsapp',true,ARRAY['remarcar','cancelar'],v_base+interval '13 hours',NULL,'demo-lembrete-001',NULL),
    ('0de09000-0000-4000-8000-000000000003',v_tenant,'0de05000-0000-4000-8000-000000000007','0de03000-0000-4000-8000-000000000002','5511911110002','cancelamento_agendamento','enviado',1,'Seu horário foi cancelado como solicitado. Você pode escolher uma nova data pelo Cortaí.',v_base-interval '2 days'+interval '9 hours',v_base-interval '2 days'+interval '9 hours',v_base-interval '2 days'+interval '9 hours','whatsapp',false,ARRAY[]::text[],NULL,NULL,'demo-cancelamento-001',NULL),
    ('0de09000-0000-4000-8000-000000000004',v_tenant,'0de05000-0000-4000-8000-000000000003','0de03000-0000-4000-8000-000000000002','5511911110002','pos_atendimento','enviado',1,'Marina, obrigado pela visita. Esperamos que tenha tido uma ótima experiência.',v_base-interval '3 days'+interval '16 hours',v_base-interval '3 days'+interval '16 hours',v_base-interval '3 days'+interval '16 hours','whatsapp',false,ARRAY[]::text[],NULL,NULL,'demo-pos-001',NULL),
    ('0de09000-0000-4000-8000-000000000005',v_tenant,'0de05000-0000-4000-8000-000000000003','0de03000-0000-4000-8000-000000000002','5511911110002','convite_avaliacao','enviado',1,'Como foi sua experiência na Aurora? Sua opinião ajuda a gente a cuidar melhor de cada visita.',v_base-interval '3 days'+interval '16 hours 5 minutes',v_base-interval '3 days'+interval '16 hours 5 minutes',v_base-interval '3 days'+interval '16 hours 5 minutes','whatsapp',false,ARRAY['avaliar'],v_base+interval '4 days',NULL,'demo-avaliacao-001',NULL)
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.config_atendimento_ia SET
    atendimento_automatico = false,
    saudacao_ativa = false,
    mensagem_boas_vindas = '',
    mensagem_fora_do_horario = '',
    encaminhamento_humano = false,
    responder_whatsapp = false,
    confirmacao_automatica = true,
    lembretes = true,
    recuperacao_ativa = true,
    recuperacao_dias = 25,
    tom = 'profissional',
    atualizado_em = now()
  WHERE tenant_id = v_tenant;

  UPDATE public.tenant_page_configs SET
    draft_config = jsonb_set(
      jsonb_set(
        jsonb_set(draft_config, '{marca,nome}', to_jsonb('Aurora Barbearia Premium'::text), true),
        '{marca,descricao}', to_jsonb('Barbearia premium de demonstração do Cortaí, com atendimento personalizado, pontualidade e cuidado em cada detalhe.'::text), true),
      '{pagina,chat}',
      '{"modo":"conversa","nomeRecepcao":"Recepção Aurora","avatarUrl":null,"mensagemInicial":"Olá! Vou ajudar você a escolher o serviço, o profissional e o melhor horário.","textoFinal":"Tudo certo. Seu horário na Aurora está reservado!","corDestaque":"azul","comemoracao":true,"salvarCalendario":true,"listaEspera":true}'::jsonb,
      true
    ),
    published_config = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(published_config, '{marca,nome}', to_jsonb('Aurora Barbearia Premium'::text), true),
            '{marca,descricao}', to_jsonb('Barbearia premium de demonstração do Cortaí, com atendimento personalizado, pontualidade e cuidado em cada detalhe.'::text), true),
          '{marca,endereco}', to_jsonb('Alameda Aurora, 128 — Jardins, São Paulo/SP'::text), true),
        '{marca,capa_url}', to_jsonb('https://cortai.dev/__l5e/assets-v1/f440c2ba-6cf8-4c48-bacb-3e259681dba5/cortai-barbershop-cover.jpg'::text), true),
      '{pagina,chat}',
      '{"modo":"conversa","nomeRecepcao":"Recepção Aurora","avatarUrl":null,"mensagemInicial":"Olá! Vou ajudar você a escolher o serviço, o profissional e o melhor horário.","textoFinal":"Tudo certo. Seu horário na Aurora está reservado!","corDestaque":"azul","comemoracao":true,"salvarCalendario":true,"listaEspera":true}'::jsonb,
      true
    ),
    published_at = now()
  WHERE tenant_id = v_tenant;

  UPDATE public.perfis SET tipo = 'barbeiro', nome = 'Gestor Demo', tenant_ativo = v_tenant
  WHERE user_id = v_usuario;
END $$;