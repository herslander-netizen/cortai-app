-- 1) Versão do horário: cada remarcação ganha um número próprio.
ALTER TABLE public.agendamentos ADD COLUMN IF NOT EXISTS versao_horario integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.agendamento_versao_horario()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if new.inicio is distinct from old.inicio then
    new.versao_horario := coalesce(old.versao_horario, 0) + 1;
  end if;
  return new;
end $$;

DROP TRIGGER IF EXISTS trg_agendamento_versao_horario ON public.agendamentos;
CREATE TRIGGER trg_agendamento_versao_horario BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_versao_horario();

CREATE OR REPLACE FUNCTION public.notificar_agendamento()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare nome text; quando text; fuso text; versao text;
begin
  select c.nome into nome from public.clientes c where c.id = new.cliente_id;
  select coalesce(nullif(t.fuso,''), 'America/Sao_Paulo') into fuso from public.tenants t where t.id = new.tenant_id;
  quando := to_char(new.inicio at time zone coalesce(fuso,'America/Sao_Paulo'), 'DD/MM HH24:MI');
  versao := new.id::text || ':' || extract(epoch from new.inicio)::bigint::text || ':v' || coalesce(new.versao_horario, 0)::text;
  if tg_op = 'INSERT' then
    perform public.criar_notificacao_evento(new.tenant_id, new.id, 'agendamento_novo', 'importante', 'Novo agendamento',
      coalesce(nome, 'Cliente') || ' — ' || quando, public.link_de_tela('agenda'), 'agendamento_novo:' || versao);
    perform public.disparar_push_agendamento(new.id, 'agendamento_novo', auth.uid());
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status and new.status in ('cancelado','cancelada') then
      perform public.criar_notificacao_evento(new.tenant_id, new.id, 'agendamento_cancelado', 'importante', 'Agendamento cancelado',
        coalesce(nome, 'Cliente') || ' — ' || quando, public.link_de_tela('agenda'), 'agendamento_cancelado:' || versao);
      perform public.disparar_push_agendamento(new.id, 'agendamento_cancelado', auth.uid());
    elsif new.inicio is distinct from old.inicio then
      perform public.criar_notificacao_evento(new.tenant_id, new.id, 'agendamento_remarcado', 'importante', 'Agendamento remarcado',
        coalesce(nome, 'Cliente') || ' — agora ' || quando, public.link_de_tela('agenda'), 'agendamento_remarcado:' || versao);
      perform public.disparar_push_agendamento(new.id, 'agendamento_remarcado', auth.uid());
    elsif old.arrived_at is null and new.arrived_at is not null and not coalesce(new.arrived_inferido, false) then
      perform public.criar_notificacao_evento(new.tenant_id, new.id, 'cliente_chegou', 'critica', 'Cliente chegou',
        coalesce(nome, 'Cliente') || ' — ' || quando, public.link_de_tela('agenda'), 'cliente_chegou:' || versao);
      perform public.disparar_push_agendamento(new.id, 'cliente_chegou', auth.uid());
    end if;
  end if;
  return new;
end;
$function$;

-- 2) Trava de repetição do WhatsApp ao cliente passa a considerar a versão.
ALTER TABLE public.envios_de_whatsapp ADD COLUMN IF NOT EXISTS versao text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS envios_de_whatsapp_agendamento_tipo_versao_uidx
  ON public.envios_de_whatsapp (agendamento_id, tipo, versao) WHERE agendamento_id IS NOT NULL;
DROP INDEX IF EXISTS public.envios_de_whatsapp_agendamento_tipo_uidx;

-- 3) Push para todo aviso do sininho da equipe (fora os da agenda, que já têm caminho próprio).
CREATE OR REPLACE FUNCTION public.disparar_push_aviso()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if coalesce(new.destinatario_tipo, '') = 'cliente'
     or new.tipo in ('agendamento_novo','agendamento_remarcado','agendamento_cancelado','cliente_chegou') then
    return new;
  end if;
  begin
    perform net.http_post(
      url := 'https://cortai.dev/api/public/push/aviso',
      headers := jsonb_build_object('Content-Type','application/json','x-cortai-push', public.chave_push_eventos()),
      body := jsonb_build_object('notificacaoId', new.id)
    );
  exception when others then null; -- push nunca bloqueia o aviso
  end;
  return new;
end $$;

DROP TRIGGER IF EXISTS trg_disparar_push_aviso ON public.notificacoes;
CREATE TRIGGER trg_disparar_push_aviso AFTER INSERT ON public.notificacoes
  FOR EACH ROW EXECUTE FUNCTION public.disparar_push_aviso();