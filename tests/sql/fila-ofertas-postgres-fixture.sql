-- Bancada AUTOCONTIDA: esquema mínimo compatível com os campos usados pelas
-- cinco RPCs propostas no PR #55. NÃO é clone do banco de produção.
-- Executar SOMENTE em PostgreSQL descartável (GitHub Actions service postgres).
-- Nenhuma conexão com Supabase, nenhum dado real ou credencial do aplicativo.
\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$roles$;

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuso text NOT NULL DEFAULT 'America/Sao_Paulo',
  intervalo_entre_min integer NOT NULL DEFAULT 0,
  espera_qualquer_profissional boolean NOT NULL DEFAULT false
);
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id)
);
CREATE TABLE public.profissionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id)
);
CREATE TABLE public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  duracao_min integer NOT NULL DEFAULT 30,
  profissional_ids uuid[] NOT NULL DEFAULT '{}'
);
CREATE TABLE public.fila_de_espera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  profissional_id uuid,
  servico_id uuid,
  janela_preferida jsonb,
  posicao integer NOT NULL DEFAULT 0,
  avisado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'aguardando'
);
CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  cliente_id uuid REFERENCES public.clientes(id),
  profissional_id uuid REFERENCES public.profissionais(id),
  servico_id uuid REFERENCES public.servicos(id),
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'agendado',
  origem text NOT NULL DEFAULT 'app',
  origem_fila_id uuid REFERENCES public.fila_de_espera(id)
);
CREATE TABLE public.ofertas_da_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  fila_id uuid NOT NULL REFERENCES public.fila_de_espera(id),
  agendamento_liberado_id uuid REFERENCES public.agendamentos(id),
  profissional_id uuid NOT NULL REFERENCES public.profissionais(id),
  servico_id uuid NOT NULL REFERENCES public.servicos(id),
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'enviada',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  expira_em timestamptz NOT NULL,
  enviada_whatsapp boolean NOT NULL DEFAULT false,
  respondida_em timestamptz,
  agendamento_criado_id uuid REFERENCES public.agendamentos(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);
-- Reflete a unicidade ativa por vaga que já existe no esquema da prévia.
CREATE UNIQUE INDEX ofertas_da_fila_uma_ativa_por_vaga_test
  ON public.ofertas_da_fila (agendamento_liberado_id)
  WHERE status = 'enviada' AND agendamento_liberado_id IS NOT NULL;

-- Simulação APENAS da fronteira de autorização do servidor.
-- Não simula Supabase Auth/RLS reais. O superuser da bancada pode configurar
-- o claim; isso nunca deve ser feito em banco remoto.
CREATE OR REPLACE FUNCTION public.chamada_do_servidor()
RETURNS boolean LANGUAGE sql STABLE
AS $auth$ SELECT coalesce(current_setting('request.jwt.claim.role', true) = 'service_role', false) $auth$;

-- Substituto explícito da RPC oficial criar_agendamento, PARA A BANCADA.
-- Reproduz a trava por profissional, conflito e retorno; NÃO reproduz
-- pagamentos, horário comercial, triggers, RLS ou todo o esquema do Flow.
-- Assim testamos as RPCs REAIS propostas, não a RPC real de agendamento.
CREATE OR REPLACE FUNCTION public.criar_agendamento(
  _tenant_id uuid, _cliente_id uuid, _profissional_id uuid,
  _servico_id uuid, _inicio timestamptz, _forma_pagamento text,
  _encaixe boolean DEFAULT false, _validar_regras boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $criar_teste$
DECLARE
  v_duracao integer;
  v_id uuid;
  v_fim timestamptz;
BEGIN
  IF NOT public.chamada_do_servidor() THEN
    RAISE EXCEPTION 'somente servidor';
  END IF;
  SELECT duracao_min INTO v_duracao FROM public.servicos
    WHERE id = _servico_id AND tenant_id = _tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'servico nao encontrado';
  END IF;
  v_fim := _inicio + make_interval(mins => v_duracao);
  PERFORM pg_advisory_xact_lock(hashtextextended('agenda:' || _profissional_id::text, 0));
  IF EXISTS(
    SELECT 1 FROM public.agendamentos
      WHERE tenant_id = _tenant_id
        AND profissional_id = _profissional_id
        AND status IN ('agendado','pendente','confirmado','chegou','na_cadeira')
        AND inicio < v_fim AND fim > _inicio
  ) THEN
    RAISE EXCEPTION 'horario ja ocupado';
  END IF;
  INSERT INTO public.agendamentos(
    tenant_id, cliente_id, profissional_id, servico_id, inicio, fim,
    status, origem
  ) VALUES (
    _tenant_id, _cliente_id, _profissional_id, _servico_id, _inicio,
    v_fim, 'agendado', 'manual'
  ) RETURNING id INTO v_id;
  RETURN jsonb_build_object('agendamento_id', v_id);
END;
$criar_teste$;
