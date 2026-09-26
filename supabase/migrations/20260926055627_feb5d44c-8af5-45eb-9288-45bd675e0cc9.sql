CREATE TABLE public.whatsapp_contexto_numero (
  telefone text PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  aguardando_escolha boolean NOT NULL DEFAULT false,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_contexto_numero TO service_role;
ALTER TABLE public.whatsapp_contexto_numero ENABLE ROW LEVEL SECURITY;
UPDATE public.conexoes_whatsapp SET compartilhada = true
 WHERE provedor = 'meta' AND tenant_id IN ('f3b15330-3048-49f4-b581-f04ee3c6dac6','cb3d3362-4479-4649-80d8-acebc49c0ee4');