create table public.push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  plataforma text not null check (plataforma in ('android','ios','desktop')),
  criado_em timestamptz not null default now(),
  ultimo_sucesso_em timestamptz,
  falhas integer not null default 0
);
grant select, delete on public.push_inscricoes to authenticated;
grant all on public.push_inscricoes to service_role;
alter table public.push_inscricoes enable row level security;
create policy "Cada pessoa lê as próprias inscrições" on public.push_inscricoes
  for select to authenticated using (user_id = auth.uid());
create policy "Cada pessoa remove as próprias inscrições" on public.push_inscricoes
  for delete to authenticated using (user_id = auth.uid());
create index push_inscricoes_tenant_idx on public.push_inscricoes(tenant_id);

create table public.push_entregas (
  chave text primary key,
  criado_em timestamptz not null default now()
);
grant all on public.push_entregas to service_role;
alter table public.push_entregas enable row level security;

alter table public.notificacoes_preferencias add column if not exists no_push boolean not null default true;

create or replace function public.chave_push_eventos()
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  select valor into v from public.chaves_internas where nome = 'push_eventos';
  if v is null then
    v := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.chaves_internas(nome, valor) values ('push_eventos', v)
      on conflict (nome) do nothing;
    select valor into v from public.chaves_internas where nome = 'push_eventos';
  end if;
  return v;
end $$;
revoke all on function public.chave_push_eventos() from public, anon, authenticated;

create or replace function public.disparar_push_agendamento(_agendamento uuid, _tipo text, _ator uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://cortai.dev/api/public/push/evento',
    headers := jsonb_build_object('Content-Type','application/json','x-cortai-push', public.chave_push_eventos()),
    body := jsonb_build_object('agendamentoId', _agendamento, 'tipo', _tipo, 'ator', _ator)
  );
exception when others then
  null; -- push nunca bloqueia a agenda
end $$;
revoke all on function public.disparar_push_agendamento(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.notificar_agendamento()
returns trigger language plpgsql security definer set search_path = public as $function$
declare nome text; quando text; fuso text;
begin
  select c.nome into nome from public.clientes c where c.id = new.cliente_id;
  select coalesce(nullif(t.fuso,''), 'America/Sao_Paulo') into fuso from public.tenants t where t.id = new.tenant_id;
  quando := to_char(new.inicio at time zone coalesce(fuso,'America/Sao_Paulo'), 'DD/MM HH24:MI');
  if tg_op = 'INSERT' then
    perform public.criar_notificacao(new.tenant_id, 'agendamento_novo', 'Novo agendamento',
      coalesce(nome, 'Cliente') || ' — ' || quando, public.link_de_tela('agenda'));
    perform public.disparar_push_agendamento(new.id, 'agendamento_novo', auth.uid());
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status and new.status in ('cancelado','cancelada') then
      perform public.criar_notificacao(new.tenant_id, 'agendamento_cancelado', 'Agendamento cancelado',
        coalesce(nome, 'Cliente') || ' — ' || quando, public.link_de_tela('agenda'));
      perform public.disparar_push_agendamento(new.id, 'agendamento_cancelado', auth.uid());
    elsif new.inicio is distinct from old.inicio then
      perform public.criar_notificacao(new.tenant_id, 'agendamento_remarcado', 'Agendamento remarcado',
        coalesce(nome, 'Cliente') || ' — agora ' || quando, public.link_de_tela('agenda'));
      perform public.disparar_push_agendamento(new.id, 'agendamento_remarcado', auth.uid());
    elsif old.arrived_at is null and new.arrived_at is not null and not coalesce(new.arrived_inferido, false) then
      perform public.criar_notificacao(new.tenant_id, 'cliente_chegou', 'Cliente chegou',
        coalesce(nome, 'Cliente') || ' — ' || quando, public.link_de_tela('agenda'));
      perform public.disparar_push_agendamento(new.id, 'cliente_chegou', auth.uid());
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.notificar_agendamento() from public, anon, authenticated;