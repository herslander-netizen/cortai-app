CREATE OR REPLACE FUNCTION public.normalizar_telefone_cliente()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d text;
BEGIN
  IF NEW.telefone IS NULL THEN RETURN NEW; END IF;
  d := regexp_replace(NEW.telefone, '\D', '', 'g');
  IF d LIKE '00%' THEN d := substr(d, 3); END IF;
  IF length(d) IN (10, 11) THEN d := '55' || d; END IF;
  IF d = '' THEN RETURN NEW; END IF;
  NEW.telefone := d;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS clientes_normalizar_telefone ON public.clientes;
CREATE TRIGGER clientes_normalizar_telefone
BEFORE INSERT OR UPDATE OF telefone ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.normalizar_telefone_cliente();

UPDATE public.clientes SET telefone = telefone WHERE telefone IS NOT NULL AND telefone <> regexp_replace(telefone, '\D', '', 'g') OR (telefone IS NOT NULL AND length(telefone) IN (10,11));