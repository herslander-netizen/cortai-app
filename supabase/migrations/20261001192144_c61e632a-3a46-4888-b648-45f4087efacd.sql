-- 1) Número oficial compartilhado: vários negócios podem usar o mesmo phone_number_id.
DROP INDEX IF EXISTS public.conexoes_whatsapp_meta_phone_unico;
CREATE INDEX IF NOT EXISTS conexoes_whatsapp_meta_phone_idx ON public.conexoes_whatsapp (meta_phone_number_id) WHERE meta_phone_number_id IS NOT NULL;

-- 2) Entregas e falhas nos envios.
ALTER TABLE public.envios_de_whatsapp
  ADD COLUMN IF NOT EXISTS entregue_em timestamptz,
  ADD COLUMN IF NOT EXISTS lido_em timestamptz,
  ADD COLUMN IF NOT EXISTS falhou_em timestamptz,
  ADD COLUMN IF NOT EXISTS erro_codigo integer,
  ADD COLUMN IF NOT EXISTS proxima_tentativa_em timestamptz;
ALTER TABLE public.envios_de_whatsapp DROP CONSTRAINT IF EXISTS envios_de_whatsapp_status_check;
ALTER TABLE public.envios_de_whatsapp ADD CONSTRAINT envios_de_whatsapp_status_check
  CHECK (status = ANY (ARRAY['pendente','enviando','enviado','erro','entregue','lida','falhou','sem_modelo']));

-- 3) Telefone sem WhatsApp e supressão de marketing.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS sem_whatsapp_em timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_suprimido_em timestamptz;

-- 4) Alertas técnicos para o painel da plataforma.
CREATE TABLE IF NOT EXISTS public.alertas_da_plataforma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel text NOT NULL DEFAULT 'tecnico',
  origem text NOT NULL,
  titulo text NOT NULL,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  resolvido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.alertas_da_plataforma TO authenticated;
GRANT ALL ON public.alertas_da_plataforma TO service_role;
ALTER TABLE public.alertas_da_plataforma ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe da plataforma vê alertas" ON public.alertas_da_plataforma
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'suporte'));
CREATE POLICY "Equipe da plataforma resolve alertas" ON public.alertas_da_plataforma
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'suporte'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'suporte'));

-- 5) Links de tela num único lugar no banco (espelha src/lib/links-de-tela.ts).
CREATE OR REPLACE FUNCTION public.link_de_tela(_chave text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  select case _chave
    when 'agenda' then '/barbeiro/agenda'
    when 'espera' then '/barbeiro/fila'
    when 'financeiro' then '/barbeiro/financeiro'
    else '/barbeiro'
  end
$$;

CREATE OR REPLACE FUNCTION public.notificar_agendamento()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare nome text; quando text; fuso text;
begin
  select c.nome into nome from public.clientes c where c.id = new.cliente_id;
  select coalesce(nullif(t.fuso,''), 'America/Sao_Paulo') into fuso from public.tenants t where t.id = new.tenant_id;
  quando := to_char(new.inicio at time zone coalesce(fuso,'America/Sao_Paulo'), 'DD/MM HH24:MI');
  if tg_op = 'INSERT' then
    perform public.criar_notificacao(new.tenant_id, 'agendamento_novo', 'Novo agendamento',
      coalesce(nome, 'Cliente') || ' — ' || quando, public.link_de_tela('agenda'));
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status and new.status in ('cancelado','cancelada') then
      perform public.criar_notificacao(new.tenant_id, 'agendamento_cancelado', 'Agendamento cancelado',
        coalesce(nome, 'Cliente') || ' — ' || quando, public.link_de_tela('agenda'));
    elsif new.inicio is distinct from old.inicio then
      perform public.criar_notificacao(new.tenant_id, 'agendamento_remarcado', 'Agendamento remarcado',
        coalesce(nome, 'Cliente') || ' — agora ' || quando, public.link_de_tela('agenda'));
    end if;
  end if;
  return new;
end;
$function$;