alter table public.push_inscricoes add column if not exists em_foco_ate timestamptz;
alter table public.push_inscricoes add column if not exists discreto boolean not null default false;