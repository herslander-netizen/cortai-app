ALTER TABLE public.envios_de_whatsapp ADD COLUMN IF NOT EXISTS resposta text;
CREATE INDEX IF NOT EXISTS idx_envios_whatsapp_msg_externa ON public.envios_de_whatsapp(mensagem_externa_id);

CREATE TABLE public.preferencias_do_cliente_avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL UNIQUE REFERENCES public.clientes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_ativo boolean NOT NULL DEFAULT true,
  push_ativo boolean NOT NULL DEFAULT true,
  frequencia text NOT NULL DEFAULT 'padrao' CHECK (frequencia IN ('padrao','frequente','minima')),
  silencio_inicio time,
  silencio_fim time,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pref_cliente_avisos_tenant ON public.preferencias_do_cliente_avisos(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferencias_do_cliente_avisos TO authenticated;
GRANT ALL ON public.preferencias_do_cliente_avisos TO service_role;
ALTER TABLE public.preferencias_do_cliente_avisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe gerencia preferencias dos clientes" ON public.preferencias_do_cliente_avisos
FOR ALL TO authenticated USING (public.is_tenant_member(tenant_id)) WITH CHECK (public.is_tenant_member(tenant_id));

CREATE POLICY "Cliente gerencia as proprias preferencias" ON public.preferencias_do_cliente_avisos
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_id AND c.user_id = auth.uid() AND c.tenant_id = preferencias_do_cliente_avisos.tenant_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = cliente_id AND c.user_id = auth.uid() AND c.tenant_id = preferencias_do_cliente_avisos.tenant_id));

CREATE TRIGGER trg_pref_cliente_avisos_atualizado BEFORE UPDATE ON public.preferencias_do_cliente_avisos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_atualizado_em();