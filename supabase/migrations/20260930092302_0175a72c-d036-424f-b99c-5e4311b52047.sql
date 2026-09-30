CREATE TABLE public.tenant_slug_aliases (
  slug text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_slug_aliases_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT tenant_slug_aliases_slug_length CHECK (char_length(slug) BETWEEN 3 AND 60)
);

GRANT ALL ON public.tenant_slug_aliases TO service_role;

ALTER TABLE public.tenant_slug_aliases ENABLE ROW LEVEL SECURITY;

CREATE INDEX tenant_slug_aliases_tenant_id_idx ON public.tenant_slug_aliases (tenant_id);

CREATE OR REPLACE FUNCTION public.alterar_slug_do_tenant(_tenant_id uuid, _novo_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _slug text := lower(trim(_novo_slug));
  _slug_atual text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_tenant_owner(_tenant_id) THEN
    RAISE EXCEPTION 'Apenas o dono pode alterar o link.';
  END IF;

  IF _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR char_length(_slug) NOT BETWEEN 3 AND 60 THEN
    RAISE EXCEPTION 'Use de 3 a 60 caracteres: letras minúsculas, números e hífens.';
  END IF;

  IF _slug = ANY (ARRAY['admin','api','app','auth','avaliar','b','barbearia','barbearias','barbeiro','cliente','configurar-minha-barbearia','demonstracao','entrar','f','login','loja','manifest.webmanifest','privacidade','recuperar','suporte']) THEN
    RAISE EXCEPTION 'Este nome de link é reservado.';
  END IF;

  SELECT slug INTO _slug_atual FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Negócio não encontrado.'; END IF;
  IF _slug = _slug_atual THEN RETURN _slug; END IF;

  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = _slug AND id <> _tenant_id)
     OR EXISTS (SELECT 1 FROM public.tenant_slug_aliases WHERE slug = _slug AND tenant_id <> _tenant_id) THEN
    RAISE EXCEPTION 'Este nome de link já está em uso.';
  END IF;

  INSERT INTO public.tenant_slug_aliases (slug, tenant_id)
  VALUES (_slug_atual, _tenant_id)
  ON CONFLICT (slug) DO NOTHING;

  DELETE FROM public.tenant_slug_aliases WHERE slug = _slug AND tenant_id = _tenant_id;
  UPDATE public.tenants SET slug = _slug WHERE id = _tenant_id;
  RETURN _slug;
END;
$$;

REVOKE ALL ON FUNCTION public.alterar_slug_do_tenant(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alterar_slug_do_tenant(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_slug_do_tenant(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.resolver_tenant_por_slug(_slug text)
RETURNS TABLE(tenant_id uuid, slug_atual text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.slug
  FROM public.tenants t
  WHERE t.slug = lower(trim(_slug)) AND t.ativo = true
  UNION ALL
  SELECT t.id, t.slug
  FROM public.tenant_slug_aliases a
  JOIN public.tenants t ON t.id = a.tenant_id
  WHERE a.slug = lower(trim(_slug)) AND t.ativo = true
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.resolver_tenant_por_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolver_tenant_por_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolver_tenant_por_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_tenant_por_slug(text) TO service_role;