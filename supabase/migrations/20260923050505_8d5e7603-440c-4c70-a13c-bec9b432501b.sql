
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid null,
  tipo text not null,
  titulo text not null,
  corpo text null,
  link text null,
  lida_em timestamptz null,
  criado_em timestamptz not null default now()
);
create index if not exists notificacoes_tenant_idx on public.notificacoes (tenant_id, criado_em desc);
create index if not exists notificacoes_nao_lidas_idx on public.notificacoes (tenant_id) where lida_em is null;

grant select, insert, update on public.notificacoes to authenticated;
grant all on public.notificacoes to service_role;
alter table public.notificacoes enable row level security;

create policy "equipe ve avisos do tenant" on public.notificacoes
  for select to authenticated
  using (public.is_tenant_member(tenant_id) and (user_id is null or user_id = auth.uid()));
create policy "equipe marca avisos como lidos" on public.notificacoes
  for update to authenticated
  using (public.is_tenant_member(tenant_id) and (user_id is null or user_id = auth.uid()))
  with check (public.is_tenant_member(tenant_id) and (user_id is null or user_id = auth.uid()));

create table if not exists public.notificacoes_preferencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid not null,
  tipo text not null,
  no_app boolean not null default true,
  no_whatsapp boolean not null default false,
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, user_id, tipo)
);
grant select, insert, update, delete on public.notificacoes_preferencias to authenticated;
grant all on public.notificacoes_preferencias to service_role;
alter table public.notificacoes_preferencias enable row level security;
create policy "preferencias proprias" on public.notificacoes_preferencias
  for all to authenticated
  using (user_id = auth.uid() and public.is_tenant_member(tenant_id))
  with check (user_id = auth.uid() and public.is_tenant_member(tenant_id));

create or replace function public.criar_notificacao(_tenant uuid, _tipo text, _titulo text, _corpo text, _link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notificacoes (tenant_id, tipo, titulo, corpo, link)
  values (_tenant, _tipo, _titulo, _corpo, _link);
$$;

create or replace function public.notificar_agendamento()
returns trigger language plpgsql security definer set search_path = public as $$
declare nome text; quando text;
begin
  select c.nome into nome from public.clientes c where c.id = new.cliente_id;
  quando := to_char(new.inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');
  if tg_op = 'INSERT' then
    perform public.criar_notificacao(new.tenant_id, 'agendamento_novo', 'Novo agendamento',
      coalesce(nome, 'Cliente') || ' — ' || quando, '/barbeiro/agenda');
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status and new.status in ('cancelado','cancelada') then
      perform public.criar_notificacao(new.tenant_id, 'agendamento_cancelado', 'Agendamento cancelado',
        coalesce(nome, 'Cliente') || ' — ' || quando, '/barbeiro/agenda');
    elsif new.inicio is distinct from old.inicio then
      perform public.criar_notificacao(new.tenant_id, 'agendamento_remarcado', 'Agendamento remarcado',
        coalesce(nome, 'Cliente') || ' — agora ' || quando, '/barbeiro/agenda');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notificar_agendamento on public.agendamentos;
create trigger trg_notificar_agendamento after insert or update on public.agendamentos
for each row execute function public.notificar_agendamento();

create or replace function public.notificar_fila()
returns trigger language plpgsql security definer set search_path = public as $$
declare nome text;
begin
  select c.nome into nome from public.clientes c where c.id = new.cliente_id;
  perform public.criar_notificacao(new.tenant_id, 'fila', 'Cliente entrou na fila',
    coalesce(nome, 'Cliente') || ' está aguardando', '/barbeiro/fila');
  return new;
end;
$$;
drop trigger if exists trg_notificar_fila on public.fila_de_espera;
create trigger trg_notificar_fila after insert on public.fila_de_espera
for each row execute function public.notificar_fila();

create or replace function public.notificar_fiado()
returns trigger language plpgsql security definer set search_path = public as $$
declare nome text;
begin
  select c.nome into nome from public.clientes c where c.id = new.cliente_id;
  perform public.criar_notificacao(new.tenant_id, 'fiado', 'Fiado em aberto',
    coalesce(nome, 'Cliente') || ' — R$ ' || to_char(new.saldo_centavos / 100.0, 'FM999999990.00'), '/barbeiro/financeiro');
  return new;
end;
$$;
drop trigger if exists trg_notificar_fiado on public.fiados;
create trigger trg_notificar_fiado after insert on public.fiados
for each row execute function public.notificar_fiado();

create or replace function public.notificar_pix()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo = 'entrada' and coalesce(new.forma_pagamento,'') = 'pix' then
    perform public.criar_notificacao(new.tenant_id, 'pix', 'Pix recebido',
      'R$ ' || to_char(new.valor_centavos / 100.0, 'FM999999990.00') || ' — ' || new.descricao, '/barbeiro/caixa');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_notificar_pix on public.caixa_movimentos;
create trigger trg_notificar_pix after insert on public.caixa_movimentos
for each row execute function public.notificar_pix();

alter publication supabase_realtime add table public.notificacoes;
