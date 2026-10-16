-- Interruptor geral da CortAI por negócio, controlado pelo ADM da plataforma.
-- Só acréscimo: coluna nova com padrão "ligada" (nada muda para quem já usa)
-- e um gatilho que impede a equipe de religar pelo próprio login.
ALTER TABLE public.config_atendimento_ia
  ADD COLUMN IF NOT EXISTS cortai_ativa boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.config_atendimento_ia.cortai_ativa IS
  'Interruptor geral da CortAI (ADM). false desliga a IA no painel, no WhatsApp e no site; agenda, comandas e avisos seguem. Só muda pelo servidor.';

CREATE OR REPLACE FUNCTION public.proteger_cortai_ativa()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF public.chamada_do_servidor() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.cortai_ativa := true;
  ELSIF NEW.cortai_ativa IS DISTINCT FROM OLD.cortai_ativa THEN
    NEW.cortai_ativa := OLD.cortai_ativa;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.proteger_cortai_ativa() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS proteger_cortai_ativa ON public.config_atendimento_ia;
CREATE TRIGGER proteger_cortai_ativa
  BEFORE INSERT OR UPDATE ON public.config_atendimento_ia
  FOR EACH ROW EXECUTE FUNCTION public.proteger_cortai_ativa();
