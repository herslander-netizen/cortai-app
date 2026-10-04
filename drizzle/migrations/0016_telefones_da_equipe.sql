CREATE TABLE public.telefones_da_equipe (
  user_id uuid PRIMARY KEY,
  telefone text,
  verificado_em timestamptz,
  codigo_hash text,
  codigo_expira_em timestamptz,
  tentativas integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.telefones_da_equipe IS 'WhatsApp verificado da equipe: identifica profissional/dono nas conversas do CortAI. Acesso só pelo servidor.';
GRANT ALL ON public.telefones_da_equipe TO service_role;
ALTER TABLE public.telefones_da_equipe ENABLE ROW LEVEL SECURITY;
CREATE INDEX telefones_da_equipe_telefone_idx ON public.telefones_da_equipe (telefone) WHERE verificado_em IS NOT NULL;