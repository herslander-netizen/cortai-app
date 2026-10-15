-- Imitação mínima do ambiente Supabase, só para ensaio local.
do $$ begin
 if not exists (select 1 from pg_roles where rolname='anon') then
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create role authenticator noinherit login; create role supabase_admin superuser;
 end if; end $$;
create schema extensions; create schema auth; create schema storage; create schema cron; create schema net;
create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions;
create table auth.users (id uuid primary key default extensions.gen_random_uuid(), email text, phone text,
  raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', created_at timestamptz default now(),
  email_confirmed_at timestamptz, last_sign_in_at timestamptz, deleted_at timestamptz, is_anonymous boolean default false, aud text, role text, encrypted_password text, updated_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true),''), (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'sub'))::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true),''), (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'role'),'anon') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now(), owner uuid);
create table storage.objects (id uuid primary key default extensions.gen_random_uuid(), bucket_id text references storage.buckets, name text, owner uuid, metadata jsonb, created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
create table cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text, active boolean default true);
create function cron.schedule(jobname text, schedule text, command text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values ($1,$2,$3) on conflict (jobname) do update set schedule=excluded.schedule, command=excluded.command returning jobid $$;
create function cron.alter_job(job_id bigint, schedule text default null, command text default null, database text default null, username text default null, active boolean default null) returns void language sql as $$ update cron.job set schedule=coalesce($2,schedule), command=coalesce($3,command), active=coalesce($6,active) where jobid=$1 $$;
create function cron.unschedule(jobname text) returns boolean language sql as $$ delete from cron.job where jobname=$1 returning true $$;
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ select 1::bigint $$;
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
do $$ begin if not exists (select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if; end $$;

grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;
