ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS segmento text NOT NULL DEFAULT 'barbearia';

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_segmento_check;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_segmento_check CHECK (segmento IN ('barbearia', 'salao', 'cabeleireiro', 'esmalteria', 'sobrancelha_cilios', 'estetica', 'outro'));

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_identidade_app_check;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_identidade_app_check CHECK (identidade_app IN ('moderno', 'rose', 'indigo', 'copper', 'classico'));

CREATE OR REPLACE FUNCTION public.criar_barbearia(_nome text, _segmento text DEFAULT 'barbearia', _identidade_app text DEFAULT 'moderno', _modo text DEFAULT 'escuro')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _uid uuid := auth.uid();
  _slug text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'sem sessao';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenant_usuarios WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'ja vinculado a um negocio';
  END IF;
  IF _segmento NOT IN ('barbearia', 'salao', 'cabeleireiro', 'esmalteria', 'sobrancelha_cilios', 'estetica', 'outro') THEN
    RAISE EXCEPTION 'segmento invalido';
  END IF;
  IF _identidade_app NOT IN ('moderno', 'rose', 'indigo', 'copper', 'classico') THEN
    RAISE EXCEPTION 'identidade invalida';
  END IF;
  IF _modo NOT IN ('claro', 'escuro', 'sistema') THEN
    RAISE EXCEPTION 'modo invalido';
  END IF;
  _slug := trim(both '-' from regexp_replace(lower(unaccent_placeholder(_nome)), '[^a-z0-9]+', '-', 'g'));
  IF _slug = '' THEN
    _slug := 'negocio';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug) THEN
    _slug := _slug || '-' || substr(md5(random()::text), 1, 4);
  END IF;
  INSERT INTO public.tenants (nome, slug, segmento, identidade_app, modo)
  VALUES (_nome, _slug, _segmento, _identidade_app, _modo)
  RETURNING id INTO _id;
  INSERT INTO public.tenant_usuarios (tenant_id, user_id, papel)
  VALUES (_id, _uid, 'dono');
  RETURN _id;
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_barbearia(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_barbearia(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_barbearia(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.alterar_segmento_do_tenant(_tenant_id uuid, _segmento text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.permissao_efetiva(auth.uid(), _tenant_id, 'alterar_dados_barbearia') THEN
    RAISE EXCEPTION 'Sem permissao para alterar o tipo de negocio.';
  END IF;
  IF _segmento NOT IN ('barbearia', 'salao', 'cabeleireiro', 'esmalteria', 'sobrancelha_cilios', 'estetica', 'outro') THEN
    RAISE EXCEPTION 'Tipo de negocio invalido.';
  END IF;
  UPDATE public.tenants SET segmento = _segmento WHERE id = _tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negocio nao encontrado.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.alterar_segmento_do_tenant(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alterar_segmento_do_tenant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_segmento_do_tenant(uuid, text) TO service_role;