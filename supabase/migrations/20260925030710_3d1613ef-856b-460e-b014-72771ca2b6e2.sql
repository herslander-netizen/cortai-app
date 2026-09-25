-- 1) Colunas
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrived_inferido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS started_inferido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finished_inferido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_alterado_em timestamptz,
  ADD COLUMN IF NOT EXISTS status_alterado_por uuid;

-- 2) Conversão dos estados
ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;
ALTER TABLE public.agendamentos DISABLE TRIGGER trg_notificar_agendamento;
UPDATE public.agendamentos SET status = CASE status
  WHEN 'pendente' THEN 'agendado' WHEN 'confirmado' THEN 'agendado'
  WHEN 'concluido' THEN 'finalizado' WHEN 'falta' THEN 'nao_compareceu' ELSE status END;
UPDATE public.agendamentos SET finished_at = fim, finished_inferido = true,
  started_at = inicio, started_inferido = true, arrived_at = inicio, arrived_inferido = true
  WHERE status = 'finalizado' AND finished_at IS NULL;
ALTER TABLE public.agendamentos ENABLE TRIGGER trg_notificar_agendamento;
ALTER TABLE public.agendamentos ALTER COLUMN status SET DEFAULT 'agendado';
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_status_check CHECK (status = ANY (ARRAY[
  'agendado','chegou','na_cadeira','finalizado','cancelado','remarcado','nao_compareceu']));

-- 3) Histórico de transições
CREATE TABLE public.agendamento_transicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  de text,
  para text NOT NULL,
  por uuid,
  inferidos text[] NOT NULL DEFAULT '{}',
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agendamento_transicoes_ag_idx ON public.agendamento_transicoes(agendamento_id, criado_em);
GRANT SELECT ON public.agendamento_transicoes TO authenticated;
GRANT ALL ON public.agendamento_transicoes TO service_role;
ALTER TABLE public.agendamento_transicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipe ve transicoes" ON public.agendamento_transicoes FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

-- 4) Máquina de estados (BEFORE)
CREATE OR REPLACE FUNCTION public.agendamento_maquina_estados()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  r_new int; agora timestamptz := now(); dur interval;
BEGIN
  NEW.status := CASE NEW.status
    WHEN 'pendente' THEN 'agendado' WHEN 'confirmado' THEN 'agendado'
    WHEN 'concluido' THEN 'finalizado' WHEN 'falta' THEN 'nao_compareceu' ELSE NEW.status END;

  IF TG_OP = 'UPDATE' THEN
    -- horários só mudam pelo servidor
    NEW.arrived_at := OLD.arrived_at; NEW.started_at := OLD.started_at; NEW.finished_at := OLD.finished_at;
    NEW.arrived_inferido := OLD.arrived_inferido; NEW.started_inferido := OLD.started_inferido;
    NEW.finished_inferido := OLD.finished_inferido;
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      NEW.status_alterado_em := OLD.status_alterado_em;
      NEW.status_alterado_por := OLD.status_alterado_por;
      RETURN NEW;
    END IF;
  ELSE
    NEW.arrived_at := NULL; NEW.started_at := NULL; NEW.finished_at := NULL;
    NEW.arrived_inferido := false; NEW.started_inferido := false; NEW.finished_inferido := false;
  END IF;

  NEW.status_alterado_em := agora;
  NEW.status_alterado_por := COALESCE(auth.uid(), NEW.status_alterado_por);

  r_new := CASE NEW.status WHEN 'agendado' THEN 0 WHEN 'chegou' THEN 1
    WHEN 'na_cadeira' THEN 2 WHEN 'finalizado' THEN 3 ELSE NULL END;
  IF r_new IS NULL THEN RETURN NEW; END IF; -- estados excepcionais não mexem nos horários

  SELECT make_interval(mins => s.duracao_min) INTO dur FROM servicos s WHERE s.id = NEW.servico_id;
  dur := COALESCE(dur, NEW.fim - NEW.inicio, interval '30 minutes');

  -- voltar: limpa horários das etapas desfeitas
  IF r_new < 3 THEN NEW.finished_at := NULL; NEW.finished_inferido := false; END IF;
  IF r_new < 2 THEN NEW.started_at := NULL; NEW.started_inferido := false; END IF;
  IF r_new < 1 THEN NEW.arrived_at := NULL; NEW.arrived_inferido := false; END IF;

  -- avançar: etapa atual recebe now(); puladas são estimadas
  IF r_new = 3 AND NEW.finished_at IS NULL THEN NEW.finished_at := agora; NEW.finished_inferido := false; END IF;
  IF r_new >= 2 AND NEW.started_at IS NULL THEN
    IF r_new = 2 THEN NEW.started_at := agora; NEW.started_inferido := false;
    ELSE NEW.started_at := GREATEST(COALESCE(NEW.arrived_at, NEW.finished_at - dur), NEW.finished_at - dur); NEW.started_inferido := true; END IF;
  END IF;
  IF r_new >= 1 AND NEW.arrived_at IS NULL THEN
    IF r_new = 1 THEN NEW.arrived_at := agora; NEW.arrived_inferido := false;
    ELSE NEW.arrived_at := LEAST(NEW.started_at, GREATEST(NEW.inicio, NEW.started_at - interval '10 minutes')); NEW.arrived_inferido := true; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.agendamento_maquina_estados() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_agendamento_maquina_estados
  BEFORE INSERT OR UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_maquina_estados();

-- 5) Registro da transição (AFTER)
CREATE OR REPLACE FUNCTION public.agendamento_registrar_transicao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NULL; END IF;
  INSERT INTO agendamento_transicoes(agendamento_id, tenant_id, de, para, por, inferidos)
  VALUES (NEW.id, NEW.tenant_id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, NEW.status,
    NEW.status_alterado_por,
    array_remove(ARRAY[
      CASE WHEN NEW.arrived_inferido AND (TG_OP='INSERT' OR NOT OLD.arrived_inferido OR OLD.arrived_at IS NULL) THEN 'arrived_at' END,
      CASE WHEN NEW.started_inferido AND (TG_OP='INSERT' OR NOT OLD.started_inferido OR OLD.started_at IS NULL) THEN 'started_at' END,
      CASE WHEN NEW.finished_inferido AND (TG_OP='INSERT' OR NOT OLD.finished_inferido OR OLD.finished_at IS NULL) THEN 'finished_at' END
    ], NULL));
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.agendamento_registrar_transicao() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_agendamento_registrar_transicao
  AFTER INSERT OR UPDATE OF status ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_registrar_transicao();

-- 6) Funções existentes passam a usar os novos nomes (grants preservados)
DO $$
DECLARE f record; def text;
BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('marcar_falta','preparar_comanda','preparar_comanda_segura',
      'confirmar_pagamento_agendamento','criar_agendamento','cancelar_agendamento',
      'confirmar_pagamento_comanda','confirmar_pagamento_comanda_segura') LOOP
    def := pg_get_functiondef(f.oid);
    def := replace(def, '''cancelado'',''falta''', '''cancelado'',''nao_compareceu'',''remarcado''');
    def := replace(def, '''cancelado'', ''falta''', '''cancelado'',''nao_compareceu'',''remarcado''');
    def := replace(def, '''falta''', '''nao_compareceu''');
    def := replace(def, 'status = ''concluido''', 'status = ''finalizado''');
    def := replace(def, 'status=''concluido''', 'status=''finalizado''');
    def := replace(def, 'SET status=''confirmado'' WHERE id=a.id AND status=''pendente''', 'SET status=''agendado'' WHERE id=a.id AND status=''agendado''');
    def := replace(def, ', ''confirmado'', _forma_pagamento', ', ''agendado'', _forma_pagamento');
    EXECUTE def;
  END LOOP;
END $$;

-- 7) Tempo real
ALTER TABLE public.agendamentos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;

-- 8) Fuso: garantir padrão
UPDATE public.tenants SET fuso = 'America/Sao_Paulo' WHERE fuso IS NULL OR fuso = '';