-- Itens de venda só mudam pelas funções oficiais (registrar_venda_produto, SECURITY DEFINER)
-- e pelo servidor. Antes, qualquer membro ativo podia incluir, alterar ou apagar itens pela
-- API, sem a permissão financeira que `vendas` exige. Agora a equipe só lê, e só os itens das
-- vendas que ela já pode ver: a subconsulta em `vendas` aplica as regras de leitura de `vendas`.
-- Troca de política sem apagar dados (mesmo padrão das migrações anteriores).
DROP POLICY IF EXISTS "tenant gerencia itens de venda" ON public.venda_itens;--> statement-breakpoint
DROP POLICY IF EXISTS "equipe le itens das vendas visiveis" ON public.venda_itens;--> statement-breakpoint
CREATE POLICY "equipe le itens das vendas visiveis" ON public.venda_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendas v WHERE v.id = venda_itens.venda_id));--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.venda_itens FROM anon, authenticated;
