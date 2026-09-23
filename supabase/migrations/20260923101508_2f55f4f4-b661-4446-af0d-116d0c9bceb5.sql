ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS fuso text NOT NULL DEFAULT 'America/Sao_Paulo';

UPDATE public.tenants SET
  nome = 'Barbearia Prime',
  slug = 'barbearia-prime',
  descricao = 'Barbearia premium no coração da cidade. Cortes clássicos e modernos, barba na navalha e atendimento no horário marcado.',
  telefone = '(11) 4002-8922',
  endereco = 'Rua das Palmeiras, 128 — Centro, São Paulo/SP',
  instagram = 'barbeariaprime.demo',
  whatsapp = '5511400289220',
  texto_boas_vindas = 'Bem-vindo à Barbearia Prime. Agende seu horário em poucos toques.',
  cor_primaria = '#C9A227',
  cor_secundaria = '#14110F',
  cor_accent = '#E7D9A8',
  logo_url = '0de00000-0000-4000-8000-000000000001/prime-logo.png',
  capa_url = '0de00000-0000-4000-8000-000000000001/prime-capa.jpg',
  fuso = 'America/Sao_Paulo',
  ativo = true
WHERE id = '0de00000-0000-4000-8000-000000000001';

UPDATE public.profissionais SET nome = 'Lucas Almeida', descricao = 'Especialista em degradê e cortes modernos.', ativo = true WHERE id = '0de01000-0000-4000-8000-000000000001';
UPDATE public.profissionais SET nome = 'Rafael Martins', descricao = 'Barba na navalha e cuidados clássicos.', ativo = true WHERE id = '0de01000-0000-4000-8000-000000000002';
UPDATE public.profissionais SET nome = 'João Pedro', descricao = 'Cortes sociais, infantil e sobrancelha.', ativo = true WHERE id = '0de01000-0000-4000-8000-000000000003';
UPDATE public.profissionais SET ativo = false WHERE id = '0de01000-0000-4000-8000-000000000004';

UPDATE public.servicos SET nome = 'Corte Masculino', preco_centavos = 3500, duracao_min = 30, ordem = 1, ativo = true WHERE id = '0de02000-0000-4000-8000-000000000001';
UPDATE public.servicos SET nome = 'Corte + Barba',   preco_centavos = 5500, duracao_min = 60, ordem = 2, ativo = true WHERE id = '0de02000-0000-4000-8000-000000000002';
UPDATE public.servicos SET nome = 'Barba',           preco_centavos = 3000, duracao_min = 30, ordem = 3, ativo = true WHERE id = '0de02000-0000-4000-8000-000000000003';
UPDATE public.servicos SET nome = 'Corte Degradê',   preco_centavos = 4000, duracao_min = 45, ordem = 4, ativo = true WHERE id = '0de02000-0000-4000-8000-000000000004';
UPDATE public.servicos SET nome = 'Sobrancelha',     preco_centavos = 1500, duracao_min = 15, ordem = 5, ativo = true WHERE id = '0de02000-0000-4000-8000-000000000005';
UPDATE public.servicos SET nome = 'Combo Premium',   preco_centavos = 7000, duracao_min = 75, ordem = 6, ativo = true WHERE id = '0de02000-0000-4000-8000-000000000006';

INSERT INTO public.horarios_de_funcionamento (tenant_id, dia_semana, fechado, abre, fecha)
VALUES
  ('0de00000-0000-4000-8000-000000000001', 0, true,  '09:00', '19:00'),
  ('0de00000-0000-4000-8000-000000000001', 1, false, '09:00', '20:00'),
  ('0de00000-0000-4000-8000-000000000001', 2, false, '09:00', '20:00'),
  ('0de00000-0000-4000-8000-000000000001', 3, false, '09:00', '20:00'),
  ('0de00000-0000-4000-8000-000000000001', 4, false, '09:00', '20:00'),
  ('0de00000-0000-4000-8000-000000000001', 5, false, '09:00', '21:00'),
  ('0de00000-0000-4000-8000-000000000001', 6, false, '08:00', '18:00')
ON CONFLICT (tenant_id, dia_semana) DO UPDATE
  SET fechado = EXCLUDED.fechado, abre = EXCLUDED.abre, fecha = EXCLUDED.fecha, atualizado_em = now();