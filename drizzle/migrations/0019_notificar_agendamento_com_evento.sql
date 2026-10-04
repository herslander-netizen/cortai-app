CREATE OR REPLACE FUNCTION public.criar_notificacao_evento(_tenant uuid, _agendamento uuid, _evento text, _prioridade text, _titulo text, _corpo text, _link text, _chave text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  insert into public.notificacoes (tenant_id, agendamento_id, tipo, evento, prioridade, destinatario_tipo, titulo, corpo, link, chave_dedupe)
  values (_tenant, _agendamento, _evento, _evento, _prioridade, 'gestor', _titulo, _corpo, _link, _chave)
  on conflict (tenant_id, chave_dedupe) where chave_dedupe is not null do nothing;
$$;
REVOKE ALL ON FUNCTION public.criar_notificacao_evento(uuid, uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notificar_agendamento()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare nome text; quando text; fuso text; versao text;
begin
  select c.nome into nome from public.clientes c where c.id = new.cliente_id;
  select coalesce(nullif(t.fuso,''), 'America/Sao_Paulo') into fuso from public.tenants t where t.id = new.tenant_id;
  quando := to_char(new.inicio at time zone coalesce(fuso,'America/Sao_Paulo'), 'DD/MM HH24:MI');
  versao := new.id::text || ':' || extract(epoch from new.inicio)::bigint::text;
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