CREATE OR REPLACE FUNCTION public.definir_barbeiro_recebe(_tenant uuid, _valor boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_tenant_permission(_tenant, 'gerenciar_permissoes') THEN
    RAISE EXCEPTION 'sem permissao' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.configuracoes_financeiras (tenant_id, barbeiro_recebe) VALUES (_tenant, _valor)
  ON CONFLICT (tenant_id) DO UPDATE SET barbeiro_recebe = EXCLUDED.barbeiro_recebe;
  PERFORM public.registrar_auditoria_barbearia(_tenant, 'permissoes.barbeiro_recebe', 'barbeiro_recebe', jsonb_build_object('valor', _valor));
END $$;
REVOKE ALL ON FUNCTION public.definir_barbeiro_recebe(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_barbeiro_recebe(uuid, boolean) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.regras_de_plano TO authenticated;
GRANT ALL ON public.regras_de_plano TO service_role;