ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS lista_espera_automatica boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.tenants.lista_espera_automatica IS 'Quando falso, vagas liberadas não geram ofertas automáticas à lista de espera; ninguém é removido.';

CREATE OR REPLACE FUNCTION public.definir_lista_espera_automatica(_tenant_id uuid, _ativo boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_tenant_permission(_tenant_id, 'alterar_dados_barbearia') THEN
    RAISE EXCEPTION 'Sem permissão para alterar esta configuração.';
  END IF;
  UPDATE public.tenants SET lista_espera_automatica = _ativo WHERE id = _tenant_id;
  RETURN _ativo;
END;
$$;
REVOKE ALL ON FUNCTION public.definir_lista_espera_automatica(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_lista_espera_automatica(uuid, boolean) TO authenticated;