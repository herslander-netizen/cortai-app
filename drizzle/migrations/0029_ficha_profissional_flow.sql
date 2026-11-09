-- Flow: dados da ficha (sem expor telefone pela tabela pública profissionais),
-- disponibilidade excepcional por data e fotos de profissionais.
-- Aditivo, com acesso por tenant. A integração da agenda usa ocupacoes-extras.server.ts.

create unique index if not exists profissionais_tenant_id_id_fkey_idx
  on public.profissionais(tenant_id, id);

create table if not exists public.profissionais_ficha (
  profissional_id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  atividade text check (atividade is null or char_length(atividade) <= 100),
  telefone_contato text check (telefone_contato is null or char_length(telefone_contato) <= 22),
  atualizado_em timestamptz not null default now(),
  constraint profissionais_ficha_profissional_tenant_fk
    foreign key (tenant_id, profissional_id)
    references public.profissionais(tenant_id, id) on delete cascade
);

create index if not exists profissionais_ficha_tenant_idx
  on public.profissionais_ficha(tenant_id);

alter table public.profissionais_ficha enable row level security;
grant select, insert, update, delete on public.profissionais_ficha to authenticated;

do $$ begin
  create policy "Flow gestor consulta ficha" on public.profissionais_ficha
    for select to authenticated
    using (tem_alguma_permissao(tenant_id, array['gerenciar_profissionais','gerenciar_permissoes','alterar_dados_barbearia']::text[]));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Flow gestor cria ficha" on public.profissionais_ficha
    for insert to authenticated
    with check (tem_alguma_permissao(tenant_id, array['gerenciar_profissionais','alterar_dados_barbearia']::text[]));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Flow gestor altera ficha" on public.profissionais_ficha
    for update to authenticated
    using (tem_alguma_permissao(tenant_id, array['gerenciar_profissionais','alterar_dados_barbearia']::text[]))
    with check (tem_alguma_permissao(tenant_id, array['gerenciar_profissionais','alterar_dados_barbearia']::text[]));
exception when duplicate_object then null;
end $$;

create table if not exists public.excecoes_disponibilidade_profissional (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profissional_id uuid not null,
  dia date not null,
  trabalha boolean not null,
  abre time without time zone,
  fecha time without time zone,
  atualizado_em timestamptz not null default now(),
  constraint excecoes_profissional_tenant_fk
    foreign key (tenant_id, profissional_id)
    references public.profissionais(tenant_id, id) on delete cascade,
  constraint excecoes_profissional_uma_por_dia unique (profissional_id, dia),
  constraint excecoes_profissional_horario_valido check (
    (not trabalha and abre is null and fecha is null) or
    (trabalha and abre is not null and fecha is not null and abre < fecha)
  )
);

create index if not exists excecoes_profissional_tenant_dia_idx
  on public.excecoes_disponibilidade_profissional(tenant_id, dia);

alter table public.excecoes_disponibilidade_profissional enable row level security;
grant select, insert, update, delete on public.excecoes_disponibilidade_profissional to authenticated;

do $$ begin
  create policy "Flow equipe consulta disponibilidade por data" on public.excecoes_disponibilidade_profissional
    for select to authenticated
    using (is_tenant_member(tenant_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Flow gestor cria disponibilidade por data" on public.excecoes_disponibilidade_profissional
    for insert to authenticated
    with check (tem_alguma_permissao(tenant_id, array['gerenciar_profissionais','alterar_dados_barbearia']::text[]));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Flow gestor altera disponibilidade por data" on public.excecoes_disponibilidade_profissional
    for update to authenticated
    using (tem_alguma_permissao(tenant_id, array['gerenciar_profissionais','alterar_dados_barbearia']::text[]))
    with check (tem_alguma_permissao(tenant_id, array['gerenciar_profissionais','alterar_dados_barbearia']::text[]));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "Flow gestor remove disponibilidade por data" on public.excecoes_disponibilidade_profissional
    for delete to authenticated
    using (tem_alguma_permissao(tenant_id, array['gerenciar_profissionais','alterar_dados_barbearia']::text[]));
exception when duplicate_object then null;
end $$;

-- Somente o backend autenticado, com checagem de permissão e tenant,
-- faz o upload. Não conceder política INSERT pública em storage.objects.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profissionais-flow', 'profissionais-flow', true, 2097152,
        array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do nothing;

-- Salvar os dois registros em UMA transação: nenhum dado fica pela metade.
create or replace function public.salvar_dados_profissional_flow(
  _tenant_id uuid,
  _profissional_id uuid,
  _nome text,
  _atividade text,
  _telefone text
) returns void language plpgsql security invoker set search_path = public as $$
begin
  if not tem_alguma_permissao(_tenant_id, array['gerenciar_profissionais','alterar_dados_barbearia']::text[]) then
    raise exception 'sem permissao para editar profissional';
  end if;
  if length(btrim(_nome)) < 2 or length(btrim(_nome)) > 100 then
    raise exception 'nome invalido';
  end if;
  update public.profissionais
    set nome = btrim(_nome)
    where tenant_id = _tenant_id and id = _profissional_id;
  if not found then
    raise exception 'profissional nao encontrado';
  end if;
  insert into public.profissionais_ficha
    (tenant_id, profissional_id, atividade, telefone_contato, atualizado_em)
  values (_tenant_id, _profissional_id,
    nullif(btrim(coalesce(_atividade, '')), ''),
    nullif(btrim(coalesce(_telefone, '')), ''),
    now())
  on conflict (profissional_id) do update
    set atividade = excluded.atividade,
        telefone_contato = excluded.telefone_contato,
        atualizado_em = now()
    where profissionais_ficha.tenant_id = _tenant_id;
end $$;

revoke all on function public.salvar_dados_profissional_flow(uuid,uuid,text,text,text) from public, anon;
grant execute on function public.salvar_dados_profissional_flow(uuid,uuid,text,text,text) to authenticated;
