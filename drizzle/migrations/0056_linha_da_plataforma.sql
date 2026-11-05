-- Linha da plataforma (WhatsApp administrativo do Flow), decisão do dono de 05/11/2026. Só acréscimo.
-- A conexão em si continua sendo a linha `escopo = 'central'` de conexoes_whatsapp (0023: sem tenant_id, no máximo uma).
-- Aqui: o opt-in de cada pessoa e o registro de envios, que também impede o mesmo aviso de sair duas vezes.

-- Opt-in por pessoa: só recebe avisos da plataforma quem ligou, no telefone que ela mesma verificou.
ALTER TABLE public.telefones_da_equipe
  ADD COLUMN IF NOT EXISTS avisos_da_plataforma boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.telefones_da_equipe.avisos_da_plataforma IS
  'A pessoa aceitou receber avisos da plataforma Flow (queda do WhatsApp do negócio, cobrança, boas-vindas, alertas) pela linha da plataforma.';

CREATE TABLE IF NOT EXISTS public.envios_da_plataforma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Uma chave por aviso (ex.: "queda:<conexão>:<hora>"): o mesmo aviso nunca sai duas vezes.
  chave text NOT NULL,
  evento text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente',
  motivo text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT envios_da_plataforma_chave_unica UNIQUE (chave),
  CONSTRAINT envios_da_plataforma_evento_valido CHECK (evento IN (
    'whatsapp_do_negocio_caiu', 'cobranca_assinatura', 'boas_vindas_negocio', 'alerta_admin'
  )),
  CONSTRAINT envios_da_plataforma_status_valido CHECK (status IN ('pendente', 'enviado', 'falhou', 'pulado'))
);
COMMENT ON TABLE public.envios_da_plataforma IS
  'Avisos que a linha da plataforma enviou (ou pulou). Lista fechada de eventos; nunca mensagem de negócio para cliente.';
CREATE INDEX IF NOT EXISTS envios_da_plataforma_criado_idx ON public.envios_da_plataforma (criado_em DESC);

GRANT ALL ON public.envios_da_plataforma TO service_role;
ALTER TABLE public.envios_da_plataforma ENABLE ROW LEVEL SECURITY;
-- Leitura só para o admin da plataforma; gravação só pelo servidor (service role).
DROP POLICY IF EXISTS envios_da_plataforma_admin_le ON public.envios_da_plataforma;
CREATE POLICY envios_da_plataforma_admin_le ON public.envios_da_plataforma
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.envios_da_plataforma TO authenticated;
