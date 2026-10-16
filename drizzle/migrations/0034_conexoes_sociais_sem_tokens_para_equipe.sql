-- Achado C1 (auditoria de 16/10): os tokens das redes sociais (token_acesso, token_refresh)
-- ficavam legíveis por qualquer membro do negócio. A 0008 liberou só as colunas seguras com
-- GRANT por coluna, mas anon e authenticated já tinham privilégio de tabela inteira (padrão do
-- Supabase), e o GRANT por coluna não restringe nada sem tirar antes o da tabela.
-- O código só lê as colunas seguras com a sessão da pessoa (getConexoesSociais); tokens e
-- escritas passam pelo servidor (service_role). Só permissões mudam: nenhuma linha é tocada.
REVOKE ALL ON public.conexoes_sociais FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT (id, tenant_id, plataforma, status, conta_nome, conta_id_externo, avatar_url, expira_em, criado_em, atualizado_em) ON public.conexoes_sociais TO authenticated;--> statement-breakpoint
GRANT ALL ON public.conexoes_sociais TO service_role;
