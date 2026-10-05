ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS codigo text;

CREATE OR REPLACE FUNCTION public.gerar_codigo_comanda(_tenant uuid, _em timestamptz)
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  _fuso text;
  _base text;
  _codigo text;
  _i int := 0;
BEGIN
  SELECT coalesce(nullif(fuso, ''), 'America/Sao_Paulo') INTO _fuso FROM public.tenants WHERE id = _tenant;
  _base := to_char(_em AT TIME ZONE coalesce(_fuso, 'America/Sao_Paulo'), 'DDMMYYYY-HH24MI');
  LOOP
    _codigo := _base || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.comandas WHERE tenant_id = _tenant AND codigo = _codigo);
    _i := _i + 1;
    IF _i > 50 THEN
      _codigo := _base || '-' || lpad((floor(random() * 100000000))::bigint::text, 8, '0');
      EXIT;
    END IF;
  END LOOP;
  RETURN _codigo;
END $$;

CREATE OR REPLACE FUNCTION public.comandas_definir_codigo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.codigo IS NULL THEN
    NEW.codigo := public.gerar_codigo_comanda(NEW.tenant_id, coalesce(NEW.criado_em, now()));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS comandas_definir_codigo ON public.comandas;
CREATE TRIGGER comandas_definir_codigo BEFORE INSERT ON public.comandas
FOR EACH ROW EXECUTE FUNCTION public.comandas_definir_codigo();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, tenant_id, criado_em FROM public.comandas WHERE codigo IS NULL ORDER BY criado_em LOOP
    UPDATE public.comandas SET codigo = public.gerar_codigo_comanda(r.tenant_id, r.criado_em) WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS comandas_tenant_codigo_unico ON public.comandas (tenant_id, codigo);
COMMENT ON COLUMN public.comandas.codigo IS 'Código legível e único por negócio (DDMMAAAA-HHMM-XXXX no fuso do negócio); identifica a comanda, não é código de pagamento.';