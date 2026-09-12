create table if not exists public.perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  telefone text,
  tipo text not null default 'pendente' check (tipo in ('pendente','cliente','barbeiro')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

grant select, insert, update on public.perfis to authenticated;
grant all on public.perfis to service_role;

alter table public.perfis enable row level security;

create policy "perfil proprio visivel" on public.perfis for select to authenticated using (user_id = auth.uid());
create policy "criar perfil proprio" on public.perfis for insert to authenticated with check (user_id = auth.uid());
create policy "atualizar perfil proprio" on public.perfis for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em before update on public.perfis
for each row execute function public.atualizar_atualizado_em();

alter table public.clientes add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists clientes_tenant_user_idx on public.clientes (tenant_id, user_id) where user_id is not null;

drop policy if exists "cliente ve seus proprios dados" on public.clientes;
create policy "cliente ve seus proprios dados" on public.clientes for select to authenticated using (user_id = auth.uid());

create or replace function public.criar_barbearia(_nome text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
  _uid uuid := auth.uid();
  _slug text;
begin
  if _uid is null then
    raise exception 'sem sessao';
  end if;
  if exists (select 1 from public.tenant_usuarios where user_id = _uid) then
    raise exception 'ja vinculado a uma barbearia';
  end if;
  _slug := trim(both '-' from regexp_replace(lower(unaccent_placeholder(_nome)), '[^a-z0-9]+', '-', 'g'));
  if _slug = '' then
    _slug := 'barbearia';
  end if;
  if exists (select 1 from public.tenants where slug = _slug) then
    _slug := _slug || '-' || substr(md5(random()::text), 1, 4);
  end if;
  insert into public.tenants (nome, slug) values (_nome, _slug) returning id into _id;
  insert into public.tenant_usuarios (tenant_id, user_id, papel) values (_id, _uid, 'dono');
  return _id;
end;
$$;

create or replace function public.unaccent_placeholder(_texto text)
returns text
language sql
immutable
set search_path = public
as $$
  select translate(_texto,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC');
$$;

grant execute on function public.criar_barbearia(text) to authenticated;
grant execute on function public.unaccent_placeholder(text) to authenticated;