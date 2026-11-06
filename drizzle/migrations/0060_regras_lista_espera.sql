-- Regras da lista de espera escolhidas pelo negócio (dono, 06/11/2026). Só acréscimo: três colunas com os valores
-- que o motor já usava como padrão (30 min para responder, 10 min de antecedência, só o profissional pedido) e a função
-- que grava, com a mesma permissão do interruptor da lista (`alterar_dados_barbearia`).

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS espera_prazo_min smallint NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS espera_antecedencia_min smallint NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS espera_qualquer_profissional boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_espera_prazo_chk') THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_espera_prazo_chk CHECK (espera_prazo_min IN (10, 15, 30, 60));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_espera_antecedencia_chk') THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_espera_antecedencia_chk CHECK (espera_antecedencia_min IN (10, 30, 60, 120));
  END IF;
END $$;

COMMENT ON COLUMN public.tenants.espera_prazo_min IS
  'Lista de espera: minutos que o cliente tem para aceitar a vaga oferecida (10, 15, 30 ou 60).';
COMMENT ON COLUMN public.tenants.espera_antecedencia_min IS
  'Lista de espera: não oferecer vaga com menos que estes minutos para o horário (10, 30, 60 ou 120).';
COMMENT ON COLUMN public.tenants.espera_qualquer_profissional IS
  'Lista de espera: oferecer também a quem pediu outro profissional, desde que o da vaga faça o serviço.';

CREATE OR REPLACE FUNCTION public.definir_regras_lista_espera(
  _tenant_id uuid,
  _prazo_min smallint,
  _antecedencia_min smallint,
  _qualquer_profissional boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_tenant_permission(_tenant_id, 'alterar_dados_barbearia') THEN
    RAISE EXCEPTION 'Sem permissão para alterar esta configuração.';
  END IF;
  UPDATE public.tenants
     SET espera_prazo_min = _prazo_min,
         espera_antecedencia_min = _antecedencia_min,
         espera_qualquer_profissional = _qualquer_profissional
   WHERE id = _tenant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.definir_regras_lista_espera(uuid, smallint, smallint, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.definir_regras_lista_espera(uuid, smallint, smallint, boolean) TO authenticated;
