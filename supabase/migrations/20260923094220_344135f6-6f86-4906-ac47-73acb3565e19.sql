CREATE TABLE public.tenant_page_configs (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  draft_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.tenant_page_configs TO authenticated;
GRANT ALL ON public.tenant_page_configs TO service_role;

ALTER TABLE public.tenant_page_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dono le configuracao da pagina"
ON public.tenant_page_configs
FOR SELECT TO authenticated
USING (private.is_tenant_owner(tenant_id));

CREATE POLICY "dono cria configuracao da pagina"
ON public.tenant_page_configs
FOR INSERT TO authenticated
WITH CHECK (private.is_tenant_owner(tenant_id) AND draft_by = auth.uid());

CREATE POLICY "dono atualiza configuracao da pagina"
ON public.tenant_page_configs
FOR UPDATE TO authenticated
USING (private.is_tenant_owner(tenant_id))
WITH CHECK (private.is_tenant_owner(tenant_id));

CREATE OR REPLACE FUNCTION public.set_tenant_page_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_tenant_page_config_updated_at() FROM PUBLIC;

CREATE TRIGGER tenant_page_configs_updated_at
BEFORE UPDATE ON public.tenant_page_configs
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_page_config_updated_at();

CREATE OR REPLACE FUNCTION public.publish_tenant_page(
  _tenant_id uuid,
  _config jsonb,
  _nome text,
  _endereco text,
  _telefone text,
  _instagram text,
  _whatsapp text,
  _facebook text,
  _tema text,
  _cor_primaria text,
  _cor_secundaria text,
  _cor_accent text,
  _rotulo_carteira text,
  _texto_boas_vindas text,
  _descricao text,
  _capa_url text,
  _fotos jsonb,
  _assinatura_visivel boolean,
  _logo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _current public.tenants%ROWTYPE;
  _last_version integer;
  _old_page jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_tenant_owner(_tenant_id) THEN
    RAISE EXCEPTION 'Apenas o dono pode publicar a página.';
  END IF;

  SELECT * INTO _current FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Barbearia não encontrada.'; END IF;

  SELECT published_config INTO _old_page
  FROM public.tenant_page_configs
  WHERE tenant_id = _tenant_id;

  SELECT COALESCE(MAX(versao), 0) INTO _last_version
  FROM public.tenant_branding_versions
  WHERE tenant_id = _tenant_id;

  INSERT INTO public.tenant_branding_versions (tenant_id, versao, snapshot, criado_por)
  VALUES (
    _tenant_id,
    _last_version + 1,
    jsonb_build_object(
      'marca', jsonb_build_object(
        'nome', _current.nome,
        'endereco', _current.endereco,
        'telefone', _current.telefone,
        'instagram', _current.instagram,
        'whatsapp', _current.whatsapp,
        'facebook', _current.facebook,
        'tema', _current.tema,
        'cor_primaria', _current.cor_primaria,
        'cor_secundaria', COALESCE(_current.cor_secundaria, '#1C1B19'),
        'cor_accent', COALESCE(_current.cor_accent, '#8FA882'),
        'rotulo_carteira', _current.rotulo_carteira,
        'texto_boas_vindas', _current.texto_boas_vindas,
        'descricao', _current.descricao,
        'capa_url', _current.capa_url,
        'fotos', _current.fotos,
        'assinatura_visivel', _current.assinatura_visivel,
        'logo_url', _current.logo_url
      ),
      'pagina', COALESCE(_old_page, '{}'::jsonb)
    ),
    auth.uid()
  );

  UPDATE public.tenants SET
    nome = _nome,
    endereco = _endereco,
    telefone = _telefone,
    instagram = _instagram,
    whatsapp = _whatsapp,
    facebook = _facebook,
    tema = _tema,
    cor_primaria = _cor_primaria,
    cor_secundaria = _cor_secundaria,
    cor_accent = _cor_accent,
    rotulo_carteira = _rotulo_carteira,
    texto_boas_vindas = _texto_boas_vindas,
    descricao = _descricao,
    capa_url = _capa_url,
    fotos = _fotos,
    assinatura_visivel = CASE WHEN plano = 'essencial' THEN true ELSE _assinatura_visivel END,
    logo_url = _logo_url
  WHERE id = _tenant_id;

  INSERT INTO public.tenant_page_configs (
    tenant_id, draft_config, published_config, draft_by, published_by, published_at
  ) VALUES (
    _tenant_id, _config, _config, auth.uid(), auth.uid(), now()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    draft_config = EXCLUDED.draft_config,
    published_config = EXCLUDED.published_config,
    draft_by = EXCLUDED.draft_by,
    published_by = EXCLUDED.published_by,
    published_at = EXCLUDED.published_at;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_tenant_page(uuid, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_tenant_page(uuid, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_tenant_page(uuid, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, boolean, text) TO service_role;