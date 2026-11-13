-- SOMENTE no container PostgreSQL descartável do GitHub Actions.
-- Subconjunto das entidades externas de que a migração 0046 depende.
-- RLS de PACOTES e PACOTE_ITENS será carregada da migração REAL 0046.
-- Esta bancada não é cópia integral do banco Flow.
\set ON_ERROR_STOP on

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END
$roles$;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth, public TO authenticated;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $uid$
  -- A suite PostgreSQL pura injeta o claim legado; PostgREST usa o JSON.
  SELECT COALESCE(
    NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(
      NULLIF(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
      ''
    )
  )::uuid
$uid$;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.tenants (id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid());
CREATE TABLE public.memberships (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  PRIMARY KEY(tenant_id,user_id)
);
GRANT SELECT ON public.memberships TO authenticated;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY membro_le_o_proprio_acesso ON public.memberships
  FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $member$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE tenant_id=_tenant_id AND user_id=auth.uid()
  )
$member$;
CREATE OR REPLACE FUNCTION public.tem_alguma_permissao(_tenant_id uuid,_permissoes text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $permission$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE tenant_id=_tenant_id AND user_id=auth.uid() AND allowed
      AND 'alterar_dados_barbearia' = ANY(_permissoes)
  )
$permission$;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_alguma_permissao(uuid,text[]) TO authenticated;

CREATE TABLE public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  nome text NOT NULL DEFAULT 'Serviço de teste',
  preco_centavos integer NOT NULL CHECK (preco_centavos>=0),
  duracao_min integer NOT NULL DEFAULT 30,
  ativo boolean NOT NULL DEFAULT true
);
GRANT SELECT,UPDATE ON public.servicos TO authenticated;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY servicos_ativos_tenant ON public.servicos
  FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY servicos_alteracao_tenant ON public.servicos
  FOR UPDATE TO authenticated USING (public.tem_alguma_permissao(tenant_id,ARRAY['alterar_dados_barbearia']::text[]))
  WITH CHECK (public.tem_alguma_permissao(tenant_id,ARRAY['alterar_dados_barbearia']::text[]));

-- Injeção determinística de erro APÓS apagar itens de uma edição.
-- Serve para provar que o DELETE é revertido automaticamente no rollback.
CREATE OR REPLACE FUNCTION public.falhar_insercao_de_item_teste()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $fail$
BEGIN
  IF pg_catalog.current_setting('test.falhar_item',true) = 'on' THEN
    RAISE EXCEPTION 'falha proposital no segundo passo do salvamento'
      USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END
$fail$;
-- Trigger só será criado depois da migração 0046, no passo CI.
