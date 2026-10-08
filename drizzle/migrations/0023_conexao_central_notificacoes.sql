-- Central de Notificações da plataforma (aditiva, sem apagar dados).
ALTER TABLE public.conexoes_whatsapp ADD COLUMN IF NOT EXISTS escopo text NOT NULL DEFAULT 'tenant';
ALTER TABLE public.conexoes_whatsapp ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.conexoes_whatsapp ADD CONSTRAINT conexoes_whatsapp_escopo_valido
  CHECK (escopo IN ('tenant','central'));
ALTER TABLE public.conexoes_whatsapp ADD CONSTRAINT conexoes_whatsapp_escopo_tenant
  CHECK ((escopo = 'tenant' AND tenant_id IS NOT NULL) OR (escopo = 'central' AND tenant_id IS NULL AND compartilhada = false));
CREATE UNIQUE INDEX IF NOT EXISTS conexoes_whatsapp_central_unica
  ON public.conexoes_whatsapp ((true)) WHERE escopo = 'central';
COMMENT ON COLUMN public.conexoes_whatsapp.escopo IS 'tenant = conexão do negócio; central = número de notificações da plataforma (tenant_id NULL, só Admin).';

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS notificacoes_whatsapp_ativas boolean NOT NULL DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS notificacoes_central_habilitada boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.tenants.notificacoes_central_habilitada IS 'Rollout da Central de Notificações: só o Admin altera.';

CREATE OR REPLACE FUNCTION public.proteger_flag_central()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.notificacoes_central_habilitada IS DISTINCT FROM OLD.notificacoes_central_habilitada
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente a plataforma altera a Central de Notificações.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS tenants_proteger_flag_central ON public.tenants;
CREATE TRIGGER tenants_proteger_flag_central BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.proteger_flag_central();