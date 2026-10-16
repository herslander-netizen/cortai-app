-- Achado C2 (auditoria de 16/10) e achado 12 (09/10): o visitante anônimo lia todas as colunas de
-- tenants (plano, assinatura, desconto, teste...), de servicos (comissao_percentual) e de
-- profissionais (user_id). As políticas "publico ve ..." escolhem só as linhas ativas, e a migração
-- 20260912204526 liberou só as colunas públicas com GRANT por coluna, mas o privilégio de tabela
-- inteira que o Supabase dá ao anon por padrão anulava esse limite (o mesmo caso da 0034).
-- O app não lê essas tabelas como anônimo: as páginas públicas usam o servidor. As políticas de
-- outras tabelas que consultam tenants (t.id, t.ativo) usam só colunas liberadas abaixo.
-- O anon não tem política de escrita nessas tabelas; tirar o privilégio de escrita só fecha a porta.
-- Só permissões mudam: nenhuma linha é tocada e authenticated/service_role ficam como estão.
REVOKE ALL ON public.tenants, public.servicos, public.profissionais FROM anon;--> statement-breakpoint
GRANT SELECT (id, nome, slug, telefone, endereco, logo_url, cor_primaria, cor_secundaria, cor_accent, tema, assinatura_visivel, instagram, whatsapp, facebook, texto_boas_vindas, descricao, capa_url, fotos, ativo) ON public.tenants TO anon;--> statement-breakpoint
GRANT SELECT (id, tenant_id, nome, duracao_min, preco_centavos, ativo, ordem) ON public.servicos TO anon;--> statement-breakpoint
GRANT SELECT (id, tenant_id, nome, avatar_url, ativo) ON public.profissionais TO anon;
