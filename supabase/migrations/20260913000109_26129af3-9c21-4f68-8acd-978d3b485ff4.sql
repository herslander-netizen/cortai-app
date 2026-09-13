ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS controla_estoque boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS disponivel_venda boolean NOT NULL DEFAULT false;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS loja_ativa boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.recursos_de_plano (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL,
  rotulo text NOT NULL,
  descricao text,
  plano text NOT NULL,
  liberado boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chave, plano)
);

GRANT SELECT ON public.recursos_de_plano TO authenticated;
GRANT INSERT, UPDATE ON public.recursos_de_plano TO authenticated;
GRANT ALL ON public.recursos_de_plano TO service_role;

ALTER TABLE public.recursos_de_plano ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros autenticados leem a matriz de recursos"
  ON public.recursos_de_plano FOR SELECT TO authenticated USING (true);

CREATE POLICY "Somente admin da plataforma cria recursos"
  ON public.recursos_de_plano FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Somente admin da plataforma altera recursos"
  ON public.recursos_de_plano FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER recursos_de_plano_atualizado_em
  BEFORE UPDATE ON public.recursos_de_plano
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();

INSERT INTO public.recursos_de_plano (chave, rotulo, descricao, plano, liberado)
SELECT r.chave, r.rotulo, r.descricao, p.plano,
  CASE p.plano WHEN 'essencial' THEN r.essencial WHEN 'pro' THEN r.pro ELSE r.studio END
FROM (VALUES
  ('loja_online', 'Loja online', 'Exibir produtos à venda na página pública da barbearia.', false, true, true),
  ('produtos_estoque', 'Produtos e estoque', 'Cadastro de produtos, custo, quantidade e estoque mínimo.', true, true, true),
  ('fidelidade', 'Fidelidade', 'Programa de selos e corte grátis.', false, true, true),
  ('fila_espera', 'Fila de espera', 'Lista de clientes aguardando encaixe.', true, true, true),
  ('indicacoes', 'Indicações', 'Programa de indicação de novos clientes.', false, true, true),
  ('crescimento', 'Crescimento e análises', 'Painel de crescimento, retenção e análises.', false, true, true),
  ('agendamento_manual', 'Agendamento manual', 'Criar agendamentos pelo painel da barbearia.', true, true, true),
  ('personalizacao_cliente', 'Personalização avançada do cliente', 'Exceções de fidelidade, descontos e condições por cliente.', false, true, true),
  ('branding_avancado', 'Página e branding avançado', 'Capa, galeria, cores e identidade personalizada.', false, false, true)
) AS r(chave, rotulo, descricao, essencial, pro, studio)
CROSS JOIN (VALUES ('essencial'), ('pro'), ('studio')) AS p(plano)
ON CONFLICT (chave, plano) DO NOTHING;