-- 1) Funções SECURITY DEFINER: revogar EXECUTE de anon, exceto as públicas por design
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname NOT IN ('entrar_na_fila_publica','fila_publica_status','home_publicada','configuracao_visual_global','contato_da_plataforma')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, public', f.proname, f.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', f.proname, f.args);
  END LOOP;
END $$;

-- 2) emails_admin_autorizados: política explícita de leitura só para admin da plataforma
CREATE POLICY "admin le emails autorizados" ON public.emails_admin_autorizados
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3) horarios_de_funcionamento: leitura pública apenas de barbearias ativas
DROP POLICY "horarios visiveis publicamente" ON public.horarios_de_funcionamento;
CREATE POLICY "horarios visiveis publicamente" ON public.horarios_de_funcionamento
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id AND t.ativo));

-- 4) planos_da_plataforma: leitura para logados apenas de planos ativos
DROP POLICY "planos visiveis para logados" ON public.planos_da_plataforma;
CREATE POLICY "planos visiveis para logados" ON public.planos_da_plataforma
  FOR SELECT TO authenticated USING (ativo = true);
