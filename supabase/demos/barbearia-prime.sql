-- Barbearia de exemplo "Barbearia Prime" (dados fictícios), pedido do dono em 16/10/2026: mesmo
-- padrão do salão Bella Rosa. Atualiza o negócio 0de00000-…-0001 (antes "Barbearia Cortaí —
-- Demonstração"): nome sem "demonstração", tema Premium escuro, fotos, serviços ligados à equipe,
-- fichas, agenda, avaliações, perguntas, assistente e página pública publicada.
-- Sem DELETE: perguntas duplicadas ficam desativadas. Idempotente. Fotos conferidas em 16/10.
DO $$
DECLARE
  t constant uuid := '0de00000-0000-4000-8000-000000000001';
  dono uuid := (SELECT id FROM auth.users WHERE lower(email) = 'herslander@gmail.com');
  hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  base timestamptz := hoje::timestamp AT TIME ZONE 'America/Sao_Paulo';
  pl constant uuid := '0de01000-0000-4000-8000-000000000001'; -- Lucas Almeida
  pr constant uuid := '0de01000-0000-4000-8000-000000000002'; -- Rafael Martins
  pj constant uuid := '0de01000-0000-4000-8000-000000000003'; -- João Pedro
  pb constant uuid := '0de01000-0000-4000-8000-000000000004'; -- Bruno Alves
  s1 constant uuid := '0de02000-0000-4000-8000-000000000001'; -- Corte masculino
  s2 constant uuid := '0de02000-0000-4000-8000-000000000002'; -- Corte + barba
  s3 constant uuid := '0de02000-0000-4000-8000-000000000003'; -- Barba
  s4 constant uuid := '0de02000-0000-4000-8000-000000000004'; -- Degradê
  s5 constant uuid := '0de02000-0000-4000-8000-000000000005'; -- Sobrancelha
  s6 constant uuid := '0de02000-0000-4000-8000-000000000006'; -- Experiência Prime
  s7 constant uuid := '0de02000-0000-4000-8000-000000000007'; -- Pigmentação de barba
  s8 constant uuid := '0de02000-0000-4000-8000-000000000008'; -- Corte infantil
  u text := 'https://images.unsplash.com/photo-';
  q6 text := '?auto=format&fit=crop&w=600&q=75';
  q9 text := '?auto=format&fit=crop&w=900&q=76';
  q16 text := '?auto=format&fit=crop&w=1600&q=76';
  pagina jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = t) THEN RAISE EXCEPTION 'barbearia não encontrada'; END IF;

  UPDATE public.tenants SET
    nome = 'Barbearia Prime', segmento = 'barbearia', tema = 'premium', modo = 'escuro', identidade_app = 'moderno',
    descricao = 'Barbearia masculina com cortes modernos, barba na navalha e atendimento com hora marcada. Ambiente climatizado, cerveja gelada e Wi-Fi.',
    texto_boas_vindas = 'Fala, parceiro! Escolha o serviço e garanta seu horário em poucos toques.',
    endereco = 'Rua das Palmeiras, 128 — Centro, São Paulo/SP', telefone = '(11) 4002-8922', whatsapp = '5511940028922',
    instagram = '@barbeariaprime', facebook = 'barbeariaprime',
    capa_url = u || '1585747860715-2ba37e788b70' || q16, logo_url = NULL,
    fotos = jsonb_build_array(u||'1503951914875-452162b0f3f1'||q16, u||'1634449571010-02389ed0f9b0'||q9,
                              u||'1517832606299-7ae9b720a186'||q9, u||'1567894340315-735d7c361db0'||q9),
    cor_primaria = '#C9A96A', cor_secundaria = '#27231C', cor_accent = '#E7D1A4',
    indicacao_ativa = true, indicacao_recompensa = 'Indique um amigo e ganhe 50% no próximo corte',
    loja_ativa = true, listada = true, ativo = true, fuso = 'America/Sao_Paulo'
  WHERE id = t;

  IF dono IS NOT NULL THEN
    INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel, permissoes, ativo)
    VALUES (t, dono, 'dono', public.permissoes_padrao('dono'), true)
    ON CONFLICT (tenant_id, user_id) DO NOTHING;
  END IF;

  -- Segunda fechado; terça a sexta 9h–20h; sábado 8h–18h; domingo fechado.
  UPDATE public.horarios_de_funcionamento SET
    fechado = dia_semana IN (0, 1),
    abre = CASE WHEN dia_semana = 6 THEN '08:00'::time ELSE '09:00'::time END,
    fecha = CASE WHEN dia_semana = 6 THEN '18:00'::time ELSE '20:00'::time END
  WHERE tenant_id = t;

  UPDATE public.profissionais SET
    ativo = true,
    descricao = CASE id
      WHEN pl THEN 'Especialista em degradê, freestyle e acabamento na navalha.'
      WHEN pr THEN 'Barba terapêutica, toalha quente e pigmentação.'
      WHEN pj THEN 'Cortes sociais, tesoura e design de sobrancelha.'
      WHEN pb THEN 'Cortes infantis e clássicos. Paciência de sobra com a criançada.' END,
    avatar_url = CASE id
      WHEN pl THEN u||'1500648767791-00dcc994a43e'||q6
      WHEN pr THEN u||'1507003211169-0a1dd7228f2d'||q6
      WHEN pj THEN u||'1506794778202-cad84cf45f1d'||q6
      WHEN pb THEN u||'1472099645785-5658abf4ff4e'||q6 END
  WHERE tenant_id = t AND id IN (pl, pr, pj, pb);

  INSERT INTO public.servicos (id, tenant_id, nome, ativo, ordem) VALUES
    (s7, t, 'Pigmentação de barba', true, 7), (s8, t, 'Corte infantil', true, 8)
  ON CONFLICT (id) DO NOTHING;
  UPDATE public.servicos s SET
    nome = v.nome, categoria = v.cat, duracao_min = v.dur, preco_centavos = v.preco, ordem = v.ordem,
    comissao_percentual = 50, retorno_dias = v.ret, profissional_ids = v.profs, foto_url = u || v.foto || q9, ativo = true
  FROM (VALUES
    (s1, 'Corte masculino', 'Cabelo', 40, 5000, 1, 25, ARRAY[pl,pj,pb], '1503951914875-452162b0f3f1'),
    (s2, 'Corte + barba', 'Combo', 70, 8500, 2, 25, ARRAY[pl,pr], '1621605815971-fbc98d665033'),
    (s3, 'Barba na navalha', 'Barba', 35, 4000, 3, 15, ARRAY[pr,pj], '1599351431202-1e0f0137899a'),
    (s4, 'Degradê navalhado', 'Cabelo', 45, 6000, 4, 20, ARRAY[pl], '1622286342621-4bd786c2447c'),
    (s5, 'Sobrancelha', 'Acabamento', 15, 2000, 5, 20, ARRAY[pj], '1605497788044-5a32c7078486'),
    (s6, 'Experiência Prime', 'Combo', 90, 13000, 6, 30, ARRAY[pl,pr], '1512690459411-b9245aed614b'),
    (s7, 'Pigmentação de barba', 'Barba', 40, 7000, 7, 30, ARRAY[pr], '1599351431613-18ef1fdd27e1'),
    (s8, 'Corte infantil', 'Cabelo', 30, 4000, 8, 30, ARRAY[pb], '1593702275687-f8b402bf1fb5')
  ) AS v(id, nome, cat, dur, preco, ordem, ret, profs, foto)
  WHERE s.id = v.id AND s.tenant_id = t;

  UPDATE public.clientes c SET
    ficha_tecnica = v.ficha, ficha_chips = v.chips, opt_in_whatsapp = true,
    opt_in_em = COALESCE(c.opt_in_em, now() - interval '60 days'), arquivado_em = NULL
  FROM (VALUES
    ('0de03000-0000-4000-8000-000000000001'::uuid, 'Máquina 2 nas laterais, topo na tesoura. Volta a cada 3 semanas.', ARRAY['Máquina 1']),
    ('0de03000-0000-4000-8000-000000000002'::uuid, 'Barba alinhada, sem pigmentação. Prefere o Rafael.', ARRAY['Barba marcada']),
    ('0de03000-0000-4000-8000-000000000003'::uuid, 'Social na tesoura, risca do lado esquerdo.', ARRAY[]::text[]),
    ('0de03000-0000-4000-8000-000000000004'::uuid, 'Gosta de degradê alto e navalhado.', ARRAY['Degradê']),
    ('0de03000-0000-4000-8000-000000000005'::uuid, 'Pouca conversa, chega sempre 10 min antes.', ARRAY['Pouca conversa']),
    ('0de03000-0000-4000-8000-000000000006'::uuid, 'Sempre traz o filho (Theo, 6 anos) no sábado.', ARRAY[]::text[]),
    ('0de03000-0000-4000-8000-000000000007'::uuid, 'Experiência Prime todo mês, gosta de toalha quente.', ARRAY[]::text[]),
    ('0de03000-0000-4000-8000-000000000008'::uuid, 'Barba cheia, pigmentação leve a cada 30 dias.', ARRAY['Barba marcada'])
  ) AS v(id, ficha, chips)
  WHERE c.id = v.id AND c.tenant_id = t;

  INSERT INTO public.agendamentos (id, tenant_id, cliente_id, profissional_id, servico_id, inicio, fim, status, forma_pagamento, valor_centavos, origem, confirmado_em) VALUES
    ('0de05000-0000-4000-8000-000000000001', t, '0de03000-0000-4000-8000-000000000001', pl, s4, base - interval '21 days' + interval '14 hours', base - interval '21 days' + interval '14 hours 45 minutes', 'finalizado', 'pix', 6000, 'link_publico', base - interval '22 days'),
    ('0de05000-0000-4000-8000-000000000002', t, '0de03000-0000-4000-8000-000000000007', pr, s6, base - interval '9 days' + interval '11 hours', base - interval '9 days' + interval '12 hours 30 minutes', 'finalizado', 'balcao', 13000, 'app', base - interval '10 days'),
    ('0de05000-0000-4000-8000-000000000003', t, '0de03000-0000-4000-8000-000000000004', pl, s2, base - interval '4 days' + interval '17 hours', base - interval '4 days' + interval '18 hours 10 minutes', 'finalizado', 'pix', 8500, 'instagram', base - interval '5 days'),
    ('0de05000-0000-4000-8000-000000000004', t, '0de03000-0000-4000-8000-000000000006', pb, s8, base - interval '2 days' + interval '10 hours', base - interval '2 days' + interval '10 hours 30 minutes', 'finalizado', 'balcao', 4000, 'manual', base - interval '3 days'),
    ('0de05000-0000-4000-8000-000000000005', t, '0de03000-0000-4000-8000-000000000002', pr, s3, base + interval '1 day' + interval '9 hours', base + interval '1 day' + interval '9 hours 35 minutes', 'agendado', 'pix', 4000, 'app', base),
    ('0de05000-0000-4000-8000-000000000006', t, '0de03000-0000-4000-8000-000000000001', pl, s1, base + interval '1 day' + interval '10 hours', base + interval '1 day' + interval '10 hours 40 minutes', 'agendado', 'balcao', 5000, 'link_publico', base),
    ('0de05000-0000-4000-8000-000000000007', t, '0de03000-0000-4000-8000-000000000003', pj, s1, base + interval '1 day' + interval '15 hours', base + interval '1 day' + interval '15 hours 40 minutes', 'agendado', 'pix', 5000, 'whatsapp', NULL),
    ('0de05000-0000-4000-8000-000000000008', t, '0de03000-0000-4000-8000-000000000008', pr, s7, base + interval '2 days' + interval '14 hours', base + interval '2 days' + interval '14 hours 40 minutes', 'agendado', 'pix', 7000, 'app', base),
    ('0de05000-0000-4000-8000-000000000009', t, '0de03000-0000-4000-8000-000000000005', pj, s5, base + interval '2 days' + interval '18 hours', base + interval '2 days' + interval '18 hours 15 minutes', 'agendado', 'balcao', 2000, 'manual', NULL),
    ('0de05000-0000-4000-8000-000000000010', t, '0de03000-0000-4000-8000-000000000004', pl, s4, base + interval '3 days' + interval '11 hours', base + interval '3 days' + interval '11 hours 45 minutes', 'agendado', 'pix', 6000, 'instagram', base),
    ('0de05000-0000-4000-8000-000000000011', t, '0de03000-0000-4000-8000-000000000006', pb, s8, base + interval '4 days' + interval '9 hours', base + interval '4 days' + interval '9 hours 30 minutes', 'agendado', 'balcao', 4000, 'manual', base),
    ('0de05000-0000-4000-8000-000000000012', t, '0de03000-0000-4000-8000-000000000007', pr, s6, base + interval '4 days' + interval '10 hours', base + interval '4 days' + interval '11 hours 30 minutes', 'agendado', 'balcao', 13000, 'app', base)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.avaliacoes (id, tenant_id, agendamento_id, cliente_id, profissional_id, nota, comentario, convite_publico_enviado, criado_em, dimensoes, sinal_atencao) VALUES
    ('0de07000-0000-4000-8000-000000000001', t, '0de05000-0000-4000-8000-000000000001', '0de03000-0000-4000-8000-000000000001', pl, 5, 'Degradê perfeito, o Lucas é brabo. Agendei pelo link em 1 minuto.', true, base - interval '21 days' + interval '16 hours', '{"atendimento":5,"pontualidade":5,"agendamento":5,"experiencia":5}', false),
    ('0de07000-0000-4000-8000-000000000002', t, '0de05000-0000-4000-8000-000000000002', '0de03000-0000-4000-8000-000000000007', pr, 5, 'Experiência Prime vale cada centavo. Toalha quente e cerveja gelada.', true, base - interval '9 days' + interval '13 hours', '{"atendimento":5,"pontualidade":5,"agendamento":5,"experiencia":5}', false),
    ('0de07000-0000-4000-8000-000000000003', t, '0de05000-0000-4000-8000-000000000003', '0de03000-0000-4000-8000-000000000004', pl, 5, 'Corte e barba no capricho, saí outro homem.', true, base - interval '4 days' + interval '19 hours', '{"atendimento":5,"pontualidade":4,"agendamento":5,"experiencia":5}', false),
    ('0de07000-0000-4000-8000-000000000004', t, '0de05000-0000-4000-8000-000000000004', '0de03000-0000-4000-8000-000000000006', pb, 4, 'O Bruno tem muita paciência com criança. Meu filho amou.', true, base - interval '2 days' + interval '11 hours', '{"atendimento":5,"pontualidade":4,"agendamento":4,"experiencia":4}', false)
  ON CONFLICT (agendamento_id) DO NOTHING;

  UPDATE public.produtos p SET foto_url = u || v.foto || q9, destaque = v.dest
  FROM (VALUES
    ('0de04000-0000-4000-8000-000000000001'::uuid, '1621605815971-fbc98d665033', true),
    ('0de04000-0000-4000-8000-000000000002'::uuid, '1599351431202-1e0f0137899a', false),
    ('0de04000-0000-4000-8000-000000000005'::uuid, '1512690459411-b9245aed614b', true)
  ) AS v(id, foto, dest)
  WHERE p.id = v.id AND p.tenant_id = t;

  -- Perguntas: a primeira de cada repetida fica ativa e reescrita; as cópias ficam desativadas.
  UPDATE public.informacoes_da_barbearia i SET ativo = false
  WHERE i.tenant_id = t AND EXISTS (
    SELECT 1 FROM public.informacoes_da_barbearia o
    WHERE o.tenant_id = t AND o.pergunta = i.pergunta AND (o.criado_em, o.id) < (i.criado_em, i.id));
  UPDATE public.informacoes_da_barbearia SET resposta = 'Rua das Palmeiras, 128 — Centro, São Paulo/SP. A 3 minutos do metrô.'
  WHERE tenant_id = t AND pergunta = 'Onde fica a barbearia?';
  INSERT INTO public.informacoes_da_barbearia (tenant_id, pergunta, resposta, ativo, ordem)
  SELECT t, 'Qual o horário de funcionamento?', 'Terça a sexta das 9h às 20h e sábado das 8h às 18h. Domingo e segunda fechado.', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM public.informacoes_da_barbearia WHERE tenant_id = t AND pergunta = 'Qual o horário de funcionamento?');

  UPDATE public.config_atendimento_ia SET
    mensagem_boas_vindas = 'Fala, parceiro! 👊 Aqui é o atendimento da Barbearia Prime. Posso te mostrar serviços, preços e horários livres.',
    tom = 'amigavel', recuperacao_ativa = true, recuperacao_dias = 25, atualizado_em = now()
  WHERE tenant_id = t;

  pagina := jsonb_build_object('pagina', jsonb_build_object(
    'tema', 'premium', 'layout', 'cinematografico',
    'cores', jsonb_build_object('principal','#C9A96A','secundaria','#27231C','botao','#C9A96A','fundo','#111110','texto','#F7F6F2','destaque','#E7D1A4'),
    'fonteTitulo', 'oswald', 'fonteTexto', 'inter', 'bordas', 'moderno', 'densidade', 'equilibrada', 'botoes', 'solido',
    'frase', 'Estilo na régua, horário garantido.',
    'sobre', 'A Barbearia Prime une o clássico e o moderno: degradê na navalha, barba com toalha quente e um ambiente pra você relaxar. Agende pelo link e chegue na hora certa, sem fila.',
    'cta', 'Agendar horário',
    'componentes', jsonb_build_object('apresentacao',true,'servicos',true,'profissionais',true,'galeria',true,'avaliacoes',true,'produtos',true,'instagram',true,'localizacao',true,'horarios',true,'whatsapp',true,'cta_final',true),
    'chat', jsonb_build_object('modo','conversa','nomeRecepcao','Prime','avatarUrl',null,
      'mensagemInicial','Fala! 👊 Vou te ajudar a escolher o serviço, o barbeiro e o melhor horário.',
      'textoFinal','Fechado! Seu horário na Prime está garantido. Até lá!',
      'corDestaque','azul','comemoracao',true,'salvarCalendario',true,'listaEspera',true),
    'filaDeChegada', true, 'versao', 2, 'experiencia', 'vitrine', 'botaoFixo', true,
    'redes', jsonb_build_object('tiktok','','youtube','','site','')));
  INSERT INTO public.tenant_page_configs (tenant_id, draft_config, published_config, draft_by, published_by, published_at)
  VALUES (t, pagina, pagina, dono, dono, now())
  ON CONFLICT (tenant_id) DO UPDATE SET draft_config = excluded.draft_config, published_config = excluded.published_config, published_at = now();
END $$;
