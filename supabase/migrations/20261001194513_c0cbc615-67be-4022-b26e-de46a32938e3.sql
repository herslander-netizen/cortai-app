CREATE TABLE public.modelos_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  idioma text NOT NULL DEFAULT 'pt_BR',
  categoria text NOT NULL DEFAULT 'UTILITY',
  status text NOT NULL DEFAULT 'NAO_SUBMETIDO',
  tipo_aviso text NOT NULL,
  corpo text NOT NULL,
  rodape text,
  variaveis text[] NOT NULL DEFAULT '{}',
  exemplos text[] NOT NULL DEFAULT '{}',
  botoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_template_id text,
  waba_id text,
  motivo_status text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome, idioma)
);
GRANT SELECT ON public.modelos_whatsapp TO authenticated;
GRANT ALL ON public.modelos_whatsapp TO service_role;
ALTER TABLE public.modelos_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe da plataforma lê modelos" ON public.modelos_whatsapp
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'suporte'));
CREATE INDEX modelos_whatsapp_tipo_idx ON public.modelos_whatsapp (tipo_aviso, status);
CREATE TRIGGER modelos_whatsapp_atualizado_em BEFORE UPDATE ON public.modelos_whatsapp
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

ALTER TABLE public.envios_de_whatsapp
  ADD COLUMN IF NOT EXISTS oferta_id uuid REFERENCES public.ofertas_da_fila(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS envios_de_whatsapp_oferta_idx ON public.envios_de_whatsapp (oferta_id) WHERE oferta_id IS NOT NULL;

INSERT INTO public.modelos_whatsapp (nome, categoria, status, tipo_aviso, corpo, rodape, variaveis, exemplos, botoes, meta_template_id, waba_id) VALUES
('cortai_lembrete_vespera','UTILITY','APPROVED','lembrete_24h',
 'Olá, {{1}}! Passando para lembrar do seu horário na {{2}} no dia {{3}}, às {{4}}. Você pode confirmar, remarcar ou cancelar tocando em um dos botões abaixo.',
 NULL, ARRAY['cliente','negocio','data','hora'], ARRAY['João','Barbearia Exemplo','27/09/2026','14:30'],
 '[{"texto":"Confirmar","acao":"CORTAI_CONFIRMAR"},{"texto":"Remarcar","acao":"CORTAI_REMARCAR"},{"texto":"Cancelar","acao":"CORTAI_CANCELAR"}]',
 '1083305374284728','1051467980961489'),
('cortai_lembrete_dia','UTILITY','APPROVED','lembrete_2h',
 'Olá, {{1}}! Seu horário na {{2}} está chegando: hoje, {{3}}, às {{4}}. Toque em um dos botões abaixo para confirmar, avisar que chegou, remarcar ou cancelar.',
 NULL, ARRAY['cliente','negocio','data','hora'], ARRAY['João','Barbearia Exemplo','27/09/2026','14:30'],
 '[{"texto":"Confirmar","acao":"CORTAI_CONFIRMAR"},{"texto":"Cheguei","acao":"CORTAI_CHEGUEI"},{"texto":"Remarcar","acao":"CORTAI_REMARCAR"},{"texto":"Cancelar","acao":"CORTAI_CANCELAR"}]',
 '1808619047229421','1051467980961489'),
('cortai_confirmacao','UTILITY','NAO_SUBMETIDO','confirmacao_agendamento',
 'Olá, {{1}}! Seu horário em {{2}} está confirmado para {{3}}, às {{4}}. Serviço: {{5}}, com {{6}}. Se precisar, use os botões abaixo para remarcar ou cancelar.',
 'Enviado pelo Cortaí', ARRAY['cliente','negocio','data','hora','servico','profissional'], ARRAY['Ana','Studio Aurora','02/10/2026','14:30','Atendimento completo','Bia'],
 '[{"texto":"Remarcar","acao":"CORTAI_REMARCAR"},{"texto":"Cancelar","acao":"CORTAI_CANCELAR"}]', NULL, '1051467980961489'),
('cortai_cancelamento','UTILITY','NAO_SUBMETIDO','cancelamento',
 'Olá, {{1}}. Seu horário em {{2}} do dia {{3}}, às {{4}}, foi cancelado como você pediu. Quando quiser, toque no botão abaixo para escolher um novo horário.',
 'Enviado pelo Cortaí', ARRAY['cliente','negocio','data','hora'], ARRAY['Ana','Studio Aurora','02/10/2026','14:30'],
 '[{"texto":"Remarcar","acao":"CORTAI_REMARCAR"}]', NULL, '1051467980961489'),
('cortai_cancelado_negocio','UTILITY','NAO_SUBMETIDO','cancelamento_agendamento',
 'Olá, {{1}}. Precisamos cancelar seu horário em {{2}} do dia {{3}}, às {{4}}, por um imprevisto. Pedimos desculpas. Toque no botão abaixo para ver outros horários disponíveis.',
 'Enviado pelo Cortaí', ARRAY['cliente','negocio','data','hora'], ARRAY['Ana','Studio Aurora','02/10/2026','14:30'],
 '[{"texto":"Ver horários","acao":"CORTAI_AGENDAR"}]', NULL, '1051467980961489'),
('cortai_remarcacao','UTILITY','NAO_SUBMETIDO','remarcacao',
 'Olá, {{1}}. Seu horário em {{2}} mudou para {{3}}, às {{4}}, com {{5}}. Toque em um dos botões abaixo para confirmar o novo horário ou escolher outro.',
 'Enviado pelo Cortaí', ARRAY['cliente','negocio','data','hora','profissional'], ARRAY['Ana','Studio Aurora','03/10/2026','15:00','Bia'],
 '[{"texto":"Confirmar","acao":"CORTAI_CONFIRMAR"},{"texto":"Remarcar","acao":"CORTAI_REMARCAR"}]', NULL, '1051467980961489'),
('cortai_vaga_aberta','UTILITY','NAO_SUBMETIDO','vaga_lista_espera',
 'Olá, {{1}}! Abriu uma vaga da sua lista de espera em {{2}}: {{3}}, às {{4}}, com {{5}}. A vaga fica guardada para a sua resposta até {{6}}. Toque em um dos botões abaixo para responder.',
 'Enviado pelo Cortaí', ARRAY['cliente','negocio','data','hora','profissional','prazo'], ARRAY['Ana','Studio Aurora','02/10/2026','15:10','Lucas','14:40'],
 '[{"texto":"Quero","acao":"CORTAI_QUERO"},{"texto":"Não posso","acao":"CORTAI_NAO_POSSO"}]', NULL, '1051467980961489'),
('cortai_falta','UTILITY','NAO_SUBMETIDO','falta',
 'Olá, {{1}}. Sentimos sua falta no horário de hoje, às {{2}}, em {{3}}. Se quiser, toque no botão abaixo para escolher um novo horário.',
 'Enviado pelo Cortaí', ARRAY['cliente','hora','negocio'], ARRAY['Ana','14:30','Studio Aurora'],
 '[{"texto":"Remarcar","acao":"CORTAI_REMARCAR"}]', NULL, '1051467980961489'),
('cortai_valor_pendente','UTILITY','NAO_SUBMETIDO','valor_pendente',
 'Olá, {{1}}. Ficou um valor de {{2}} pendente do seu atendimento em {{3}}. Toque no botão abaixo para receber a chave Pix e concluir o pagamento.',
 'Enviado pelo Cortaí', ARRAY['cliente','valor','negocio'], ARRAY['Ana','R$ 45,00','Studio Aurora'],
 '[{"texto":"Mandar Pix","acao":"CORTAI_PIX"}]', NULL, '1051467980961489');