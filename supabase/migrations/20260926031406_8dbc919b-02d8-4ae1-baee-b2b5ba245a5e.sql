CREATE TABLE public.webhook_rejeicoes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  endpoint text NOT NULL,
  ip text,
  motivo text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhook_rejeicoes_ip_idx ON public.webhook_rejeicoes (ip, criado_em DESC);
GRANT ALL ON public.webhook_rejeicoes TO service_role;
ALTER TABLE public.webhook_rejeicoes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.webhook_limites (
  chave text NOT NULL,
  janela timestamptz NOT NULL,
  total integer NOT NULL DEFAULT 0,
  PRIMARY KEY (chave, janela)
);
GRANT ALL ON public.webhook_limites TO service_role;
ALTER TABLE public.webhook_limites ENABLE ROW LEVEL SECURITY;

-- Soma 1 à janela de 1 minuto da chave e diz se ainda está dentro do limite.
CREATE OR REPLACE FUNCTION public.webhook_consumir(_chave text, _limite integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _j timestamptz := date_trunc('minute', now()); _t integer;
BEGIN
  INSERT INTO webhook_limites (chave, janela, total) VALUES (_chave, _j, 1)
  ON CONFLICT (chave, janela) DO UPDATE SET total = webhook_limites.total + 1
  RETURNING total INTO _t;
  IF random() < 0.01 THEN
    DELETE FROM webhook_limites WHERE janela < now() - interval '10 minutes';
    DELETE FROM webhook_rejeicoes WHERE criado_em < now() - interval '30 days';
  END IF;
  RETURN _t <= _limite;
END $$;

-- Quantas rejeições este IP teve no último minuto.
CREATE OR REPLACE FUNCTION public.webhook_rejeicoes_recentes(_ip text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM webhook_rejeicoes WHERE ip = _ip AND criado_em > now() - interval '1 minute';
$$;

REVOKE ALL ON FUNCTION public.webhook_consumir(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.webhook_rejeicoes_recentes(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.webhook_consumir(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.webhook_rejeicoes_recentes(text) TO service_role;