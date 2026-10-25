-- Pacotes (várias visitas, com validade) e combos (serviços juntos na mesma visita) vendidos pela
-- página do negócio (layout Raízes). Só acréscimo: duas tabelas novas, sem tocar em nada existente.
-- A página pública lê pelo servidor (service_role); a equipe lê com is_tenant_member e escreve com a
-- mesma permissão que edita a vitrine (alterar_dados_barbearia). Anônimo não tem acesso direto.

CREATE TABLE IF NOT EXISTS public.pacotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('pacote', 'combo')),
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 2 AND 80),
  descricao text CHECK (descricao IS NULL OR char_length(descricao) <= 300),
  preco_centavos integer NOT NULL CHECK (preco_centavos >= 0),
  -- Só faz sentido no pacote: por quantos dias as visitas valem. Nulo = sem prazo.
  validade_dias integer CHECK (validade_dias IS NULL OR validade_dias BETWEEN 1 AND 730),
  destaque boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pacotes_tenant ON public.pacotes (tenant_id, ativo, ordem);

CREATE TABLE IF NOT EXISTS public.pacote_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id uuid NOT NULL REFERENCES public.pacotes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 50),
  UNIQUE (pacote_id, servico_id)
);
CREATE INDEX IF NOT EXISTS idx_pacote_itens_pacote ON public.pacote_itens (pacote_id);

-- Os privilégios padrão do Supabase dariam acesso ao anônimo: a página pública lê pelo servidor.
REVOKE ALL ON public.pacotes, public.pacote_itens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacotes, public.pacote_itens TO authenticated;
GRANT ALL ON public.pacotes, public.pacote_itens TO service_role;

ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacote_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe le pacotes" ON public.pacotes
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria pacotes" ON public.pacotes
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera pacotes" ON public.pacotes
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove pacotes" ON public.pacotes
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));

CREATE POLICY "equipe le itens de pacotes" ON public.pacote_itens
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY "equipe com permissao cria itens de pacotes" ON public.pacote_itens
  FOR INSERT TO authenticated
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao altera itens de pacotes" ON public.pacote_itens
  FOR UPDATE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']))
  WITH CHECK (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
CREATE POLICY "equipe com permissao remove itens de pacotes" ON public.pacote_itens
  FOR DELETE TO authenticated
  USING (public.tem_alguma_permissao(tenant_id, ARRAY['alterar_dados_barbearia']));
