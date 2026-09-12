CREATE TABLE public.pedidos_de_projeto (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  empresa text,
  whatsapp text NOT NULL,
  email text,
  tipo text NOT NULL,
  mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'novo',
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pedidos_de_projeto_nome_ck CHECK (char_length(nome) BETWEEN 2 AND 120),
  CONSTRAINT pedidos_de_projeto_whatsapp_ck CHECK (char_length(whatsapp) BETWEEN 8 AND 30),
  CONSTRAINT pedidos_de_projeto_mensagem_ck CHECK (char_length(mensagem) BETWEEN 5 AND 2000),
  CONSTRAINT pedidos_de_projeto_empresa_ck CHECK (empresa IS NULL OR char_length(empresa) <= 160),
  CONSTRAINT pedidos_de_projeto_email_ck CHECK (email IS NULL OR char_length(email) <= 255),
  CONSTRAINT pedidos_de_projeto_tipo_ck CHECK (tipo IN ('aplicativo','sistema_web','site','agendamento','integracao','outro')),
  CONSTRAINT pedidos_de_projeto_status_ck CHECK (status IN ('novo','em_contato','fechado','descartado'))
);

GRANT INSERT ON public.pedidos_de_projeto TO anon, authenticated;
GRANT SELECT, UPDATE ON public.pedidos_de_projeto TO authenticated;
GRANT ALL ON public.pedidos_de_projeto TO service_role;

ALTER TABLE public.pedidos_de_projeto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode enviar um pedido"
ON public.pedidos_de_projeto FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Somente o admin da plataforma le os pedidos"
ON public.pedidos_de_projeto FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Somente o admin da plataforma atualiza os pedidos"
ON public.pedidos_de_projeto FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pedidos_de_projeto_atualizado_em
BEFORE UPDATE ON public.pedidos_de_projeto
FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();