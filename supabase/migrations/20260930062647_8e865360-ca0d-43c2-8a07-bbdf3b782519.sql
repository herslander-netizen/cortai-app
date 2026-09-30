CREATE TABLE public.convites_de_avaliacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agendamento_id uuid NOT NULL UNIQUE REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expira_em timestamptz NOT NULL,
  usado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.convites_de_avaliacao TO service_role;
ALTER TABLE public.convites_de_avaliacao ENABLE ROW LEVEL SECURITY;

CREATE INDEX convites_de_avaliacao_validos_idx
  ON public.convites_de_avaliacao (token_hash, expira_em)
  WHERE usado_em IS NULL;

CREATE OR REPLACE FUNCTION public.validar_convite_de_avaliacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expira_em <= NEW.criado_em THEN
    RAISE EXCEPTION 'A validade do convite deve ser posterior à criação.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_convite_de_avaliacao_trigger
BEFORE INSERT OR UPDATE OF expira_em ON public.convites_de_avaliacao
FOR EACH ROW EXECUTE FUNCTION public.validar_convite_de_avaliacao();