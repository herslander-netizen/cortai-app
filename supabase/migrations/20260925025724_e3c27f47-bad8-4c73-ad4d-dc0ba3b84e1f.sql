DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.prosecdef LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.entrar_na_fila_publica(text,text,text,uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fila_publica_status(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.home_publicada() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.contato_da_plataforma() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.configuracao_visual_global() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.recalcular_carteira() FROM authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.registrar_mudanca_de_plano() FROM authenticated, service_role;