ALTER TABLE public.clientes
ADD COLUMN preferencias jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.clientes
ADD CONSTRAINT clientes_preferencias_objeto_chk
CHECK (jsonb_typeof(preferencias) = 'object');

CREATE OR REPLACE FUNCTION public.validar_preferencias_cliente()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  permitidas constant text[] := ARRAY['conversa', 'ar', 'bebida', 'musica', 'corte_habitual', 'atencao', 'assuntos'];
  chave text;
  valor text;
BEGIN
  NEW.preferencias := COALESCE(NEW.preferencias, '{}'::jsonb);

  IF jsonb_typeof(NEW.preferencias) <> 'object' THEN
    RAISE EXCEPTION 'Preferências devem ser um objeto';
  END IF;

  FOR chave IN SELECT jsonb_object_keys(NEW.preferencias)
  LOOP
    IF NOT (chave = ANY (permitidas)) THEN
      RAISE EXCEPTION 'Preferência inválida: %', chave;
    END IF;
    IF jsonb_typeof(NEW.preferencias -> chave) <> 'string' THEN
      RAISE EXCEPTION 'Preferência % deve ser texto', chave;
    END IF;
    IF (NEW.preferencias ->> chave) ~ '<[^>]*>' THEN
      RAISE EXCEPTION 'Preferências não aceitam HTML';
    END IF;
  END LOOP;

  IF NEW.preferencias ? 'conversa' AND NOT (NEW.preferencias ->> 'conversa' = ANY (ARRAY['papo', 'silencio', 'tanto_faz'])) THEN
    RAISE EXCEPTION 'Preferência de conversa inválida';
  END IF;
  IF NEW.preferencias ? 'ar' AND NOT (NEW.preferencias ->> 'ar' = ANY (ARRAY['gelado', 'ameno', 'sem_ar'])) THEN
    RAISE EXCEPTION 'Preferência de ar inválida';
  END IF;
  IF NEW.preferencias ? 'bebida' AND NOT (NEW.preferencias ->> 'bebida' = ANY (ARRAY['cafe', 'agua', 'refri', 'cerveja', 'nada'])) THEN
    RAISE EXCEPTION 'Preferência de bebida inválida';
  END IF;
  IF length(COALESCE(NEW.preferencias ->> 'musica', '')) > 40 THEN
    RAISE EXCEPTION 'Música deve ter no máximo 40 caracteres';
  END IF;
  IF length(COALESCE(NEW.preferencias ->> 'corte_habitual', '')) > 60 THEN
    RAISE EXCEPTION 'Corte habitual deve ter no máximo 60 caracteres';
  END IF;
  IF length(COALESCE(NEW.preferencias ->> 'atencao', '')) > 80 THEN
    RAISE EXCEPTION 'Atenção deve ter no máximo 80 caracteres';
  END IF;
  IF length(COALESCE(NEW.preferencias ->> 'assuntos', '')) > 80 THEN
    RAISE EXCEPTION 'Assuntos devem ter no máximo 80 caracteres';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER clientes_validar_preferencias
BEFORE INSERT OR UPDATE OF preferencias ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.validar_preferencias_cliente();

COMMENT ON COLUMN public.clientes.preferencias IS 'Preferências privadas de atendimento; podem conter informação sensível e nunca devem ser expostas publicamente ou em mensagens.';