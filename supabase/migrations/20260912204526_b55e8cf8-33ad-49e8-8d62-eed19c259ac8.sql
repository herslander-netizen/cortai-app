GRANT SELECT (id, nome, slug, telefone, endereco, logo_url, cor_primaria, cor_secundaria, cor_accent, tema, assinatura_visivel, instagram, whatsapp, facebook, texto_boas_vindas, descricao, capa_url, fotos, ativo) ON public.tenants TO anon;
CREATE POLICY "publico ve barbearias ativas" ON public.tenants FOR SELECT TO anon USING (ativo = true);

GRANT SELECT (id, tenant_id, nome, duracao_min, preco_centavos, ativo, ordem) ON public.servicos TO anon;
CREATE POLICY "publico ve servicos ativos" ON public.servicos FOR SELECT TO anon USING (ativo = true AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.ativo = true));

GRANT SELECT (id, tenant_id, nome, avatar_url, ativo) ON public.profissionais TO anon;
CREATE POLICY "publico ve profissionais ativos" ON public.profissionais FOR SELECT TO anon USING (ativo = true AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.ativo = true));

REVOKE SELECT ON public.produtos FROM anon;
GRANT SELECT (id, tenant_id, nome, foto_url, categoria, preco_centavos, ativo) ON public.produtos TO anon;