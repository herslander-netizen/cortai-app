#!/usr/bin/env python3
"""Integração SQL REAL das cinco RPCs propostas com sessões PostgreSQL distintas.

Banco 100% descartável; esquema MÍNIMO + criar_agendamento substituto.
Não homologa o schema completo, auth/RLS/triggers, nem WhatsApp/Android.
"""
from __future__ import annotations

import os
import time
import uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import psycopg

DSN = os.environ["TEST_DATABASE_URL"]
TZ = ZoneInfo("America/Sao_Paulo")
START = (datetime.now(TZ) + timedelta(days=3)).replace(
    hour=14, minute=0, second=0, microsecond=0
).astimezone(timezone.utc)
END = START + timedelta(minutes=30)
RPC = {
    "reserve": "SELECT public.reservar_oferta_da_fila(%s::uuid,%s::uuid,%s::uuid,%s::uuid,%s::uuid,%s::timestamptz,%s::timestamptz,%s::timestamptz)",
    "close": "SELECT public.encerrar_oferta_da_fila(%s::uuid,%s::uuid,%s::text)",
    "accept": "SELECT public.aceitar_oferta_da_fila(%s::text)",
    "remove": "SELECT public.retirar_entrada_da_fila(%s::uuid,%s::uuid)",
    "convert": "SELECT public.converter_entrada_da_fila(%s::uuid,%s::uuid,%s::uuid,%s::uuid,%s::timestamptz)",
}


def db(*, service: bool = True):
    conn = psycopg.connect(DSN, connect_timeout=8)
    conn.execute("SET statement_timeout = '15s'")
    conn.execute("SET lock_timeout = '10s'")
    if service:
        conn.execute("SELECT set_config('request.jwt.claim.role', 'service_role', false)")
    conn.commit()
    return conn


def call(conn, key, *args):
    return conn.execute(RPC[key], args).fetchone()[0]


def fixture():
    """Cada cenário usa IDs e tenants inéditos; sem compartilhamento de dados."""
    x = {key: uuid.uuid4() for key in
         ("tenant", "other_tenant", "prof", "other_prof", "service",
          "other_service", "client1", "client2", "other_client",
          "entry1", "entry2", "other_entry", "slot1", "slot2")}
    with db() as c:
        for key in ("tenant", "other_tenant"):
            c.execute("INSERT INTO public.tenants(id) VALUES (%s)", (x[key],))
        for key, tenant in (("prof", "tenant"), ("other_prof", "other_tenant")):
            c.execute(
                "INSERT INTO public.profissionais(id,tenant_id) VALUES (%s,%s)",
                (x[key], x[tenant]),
            )
        for key, tenant in (("service", "tenant"), ("other_service", "other_tenant")):
            c.execute(
                "INSERT INTO public.servicos(id,tenant_id,duracao_min) VALUES (%s,%s,30)",
                (x[key], x[tenant]),
            )
        for key, tenant in (("client1", "tenant"), ("client2", "tenant"),
                            ("other_client", "other_tenant")):
            c.execute("INSERT INTO public.clientes(id,tenant_id) VALUES (%s,%s)",
                      (x[key], x[tenant]))
        for entry, tenant, client, prof, service in (
            ("entry1", "tenant", "client1", "prof", "service"),
            ("entry2", "tenant", "client2", "prof", "service"),
            ("other_entry", "other_tenant", "other_client", "other_prof", "other_service"),
        ):
            c.execute(
                """INSERT INTO public.fila_de_espera
                   (id,tenant_id,cliente_id,profissional_id,servico_id,janela_preferida)
                   VALUES (%s,%s,%s,%s,%s,%s::jsonb)""",
                (x[entry], x[tenant], x[client], x[prof], x[service],
                 '{"inicio":0,"fim":24}'),
            )
        for slot in ("slot1", "slot2"):
            c.execute(
                """INSERT INTO public.agendamentos
                   (id,tenant_id,cliente_id,profissional_id,servico_id,inicio,fim,status)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,'cancelado')""",
                (x[slot], x["tenant"], x["client1"], x["prof"],
                 x["service"], START, END),
            )
    return x


def reserve(c, x, entry="entry1", slot="slot1", ttl=None, tenant="tenant"):
    return call(
        c, "reserve", x[tenant], x[entry], x[slot],
        x["prof"], x["service"], START, END,
        ttl if ttl is not None else datetime.now(timezone.utc) + timedelta(minutes=5),
    )


def close(c, x, offer, status="recusada", tenant="tenant"):
    return call(c, "close", x[tenant], offer, status)


def accept(c, token):
    return call(c, "accept", token)


def convert(c, x, entry="entry1"):
    return call(c, "convert", x["tenant"], x[entry], x["service"], x["prof"], START)


def scalar(sql, *args):
    with db() as c:
        return c.execute(sql, args).fetchone()[0]


def assert_integrity():
    """Pós-condição completa de ofertas ativas e estados terminais."""
    with db() as c:
        count = c.execute(
            """SELECT COUNT(*) FROM public.fila_de_espera f
               LEFT JOIN public.ofertas_da_fila o
                 ON o.id = f.oferta_atual_id AND o.fila_id = f.id
                 AND o.tenant_id = f.tenant_id
               WHERE (f.status='avisado' AND f.janela_preferida IS NOT NULL
                 AND (o.id IS NULL OR o.status <> 'enviada'))
                 OR (f.status IN ('atendido','saiu')
                 AND f.oferta_atual_id IS NOT NULL)"""
        ).fetchone()[0]
        assert count == 0, f"Fila com vínculos incoerentes: {count}"
        dup_entry = c.execute(
            """SELECT COUNT(*) FROM (
               SELECT fila_id FROM public.ofertas_da_fila WHERE status='enviada'
               GROUP BY fila_id HAVING COUNT(*) > 1) t"""
        ).fetchone()[0]
        dup_slot = c.execute(
            """SELECT COUNT(*) FROM (
               SELECT agendamento_liberado_id FROM public.ofertas_da_fila
               WHERE status='enviada' GROUP BY agendamento_liberado_id
               HAVING COUNT(*) > 1) t"""
        ).fetchone()[0]
        assert dup_entry == 0 and dup_slot == 0, "Ofertas ativas duplicadas"


def race(first, second):
    """Executa A sem commit, inicia B em OUTRA conexão, comprova bloqueio e libera A."""
    a, b = db(), db()
    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            result_a = first(a)  # transação A segue aberta mantendo seus locks
            future = pool.submit(second, b)
            time.sleep(0.35)
            if future.done():
                raise AssertionError("B não aguardou o lock de A; concorrência não comprovada")
            # Consulta de bloqueio em conexão independente, sem confiar só em sleep.
            with db() as inspector:
                blocked = inspector.execute(
                    """SELECT COUNT(*) FROM pg_stat_activity
                       WHERE pid = %s AND wait_event_type = 'Lock'""",
                    (b.info.backend_pid,),
                ).fetchone()[0]
            assert blocked == 1, "B não estava esperando um lock PostgreSQL"
            a.commit()
            result_b = future.result(timeout=12)
            b.commit()
        return result_a, result_b
    finally:
        if not a.closed:
            a.rollback()
            a.close()
        if not b.closed:
            b.rollback()
            b.close()


def test_two_slots_one_entry():
    x = fixture()
    a, b = race(lambda c: reserve(c, x, slot="slot1"),
                lambda c: reserve(c, x, slot="slot2"))
    assert a["ok"] is True and b["motivo"] == "entrada_indisponivel"
    assert scalar("SELECT COUNT(*) FROM public.ofertas_da_fila WHERE fila_id=%s AND status='enviada'",
                  x["entry1"]) == 1


def test_one_slot_two_entries():
    x = fixture()
    a, b = race(lambda c: reserve(c, x, entry="entry1"),
                lambda c: reserve(c, x, entry="entry2"))
    assert a["ok"] is True and b["motivo"] == "concorrente"


def test_accept_vs_decline():
    x = fixture()
    with db() as c:
        offer = reserve(c, x)
    a, b = race(lambda c: accept(c, offer["token"]),
                lambda c: close(c, x, offer["oferta_id"]))
    assert a["ok"] and b["motivo"] == "oferta_inativa"
    assert scalar("SELECT COUNT(*) FROM public.agendamentos WHERE origem_fila_id=%s",
                  x["entry1"]) == 1


def test_old_decline_cannot_release_new_offer():
    x = fixture()
    with db() as c:
        first = reserve(c, x)
        assert close(c, x, first["oferta_id"])["ok"]
        second = reserve(c, x, slot="slot2")
        old = close(c, x, first["oferta_id"])
    assert second["ok"] and old["motivo"] == "oferta_inativa"
    assert scalar("SELECT oferta_atual_id FROM public.fila_de_espera WHERE id=%s",
                  x["entry1"]) == uuid.UUID(second["oferta_id"])


def test_remove_vs_reserve():
    x = fixture()
    a, b = race(lambda c: reserve(c, x),
                lambda c: call(c, "remove", x["tenant"], x["entry1"]))
    assert a["ok"] and b["motivo"] == "concorrente"
    assert scalar("SELECT status FROM public.fila_de_espera WHERE id=%s",
                  x["entry1"]) == "avisado"


def test_convert_vs_reserve():
    x = fixture()
    a, b = race(lambda c: convert(c, x),
                lambda c: reserve(c, x))
    assert a["ok"] and b["motivo"] == "entrada_indisponivel"
    assert scalar("SELECT COUNT(*) FROM public.agendamentos WHERE origem_fila_id=%s",
                  x["entry1"]) == 1


def test_two_manual_conversions():
    x = fixture()
    a, b = race(lambda c: convert(c, x),
                lambda c: convert(c, x))
    assert a["ok"] and b["motivo"] == "entrada_indisponivel"
    assert scalar("SELECT COUNT(*) FROM public.agendamentos WHERE origem_fila_id=%s",
                  x["entry1"]) == 1


def test_expire_vs_accept():
    x = fixture()
    with db() as c:
        o = reserve(c, x, ttl=datetime.now(timezone.utc) + timedelta(seconds=2))
    time.sleep(2.25)
    a, b = race(lambda c: close(c, x, o["oferta_id"], status="expirada"),
                lambda c: accept(c, o["token"]))
    assert a["ok"] and b["motivo"] == "expirada"
    assert scalar("SELECT COUNT(*) FROM public.agendamentos WHERE origem_fila_id=%s",
                  x["entry1"]) == 0


def test_tenant_isolation():
    x = fixture()
    with db() as c:
        wrong = reserve(c, x, tenant="other_tenant")
        assert wrong["ok"] is False
        assert wrong["motivo"] == "entrada_indisponivel"
        valid = reserve(c, x)
        wrong_close = close(c, x, valid["oferta_id"], tenant="other_tenant")
        assert wrong_close["motivo"] == "oferta_inativa"
    assert scalar("SELECT oferta_atual_id FROM public.fila_de_espera WHERE id=%s",
                  x["entry1"]) == uuid.UUID(valid["oferta_id"])


def test_walk_in_queue_without_offer():
    x = fixture()
    walkin = uuid.uuid4()
    with db() as c:
        c.execute(
            """INSERT INTO public.fila_de_espera
               (id,tenant_id,cliente_id,status,avisado_em)
               VALUES (%s,%s,%s,'avisado',now())""",
            (walkin, x["tenant"], x["client1"]),
        )
        result = call(c, "remove", x["tenant"], walkin)
        assert result["ok"] is True
    assert scalar("SELECT status FROM public.fila_de_espera WHERE id=%s", walkin) == "saiu"


def test_idempotent_accept():
    x = fixture()
    with db() as c:
        o = reserve(c, x)
        one = accept(c, o["token"])
        two = accept(c, o["token"])
    assert one["ok"] and two["ok"] and two["repetida"] is True
    assert one["agendamento_id"] == two["agendamento_id"]
    assert scalar("SELECT COUNT(*) FROM public.agendamentos WHERE origem_fila_id=%s",
                  x["entry1"]) == 1


def test_no_server_claim():
    x = fixture()
    with db(service=False) as c:
        try:
            reserve(c, x)
        except psycopg.errors.RaiseException as e:
            assert "somente servidor" in str(e)
            c.rollback()
        else:
            raise AssertionError("Chamada sem claim de servidor não foi rejeitada")


def test_preflight_manual_walkin_vs_corrupt_waitlist():
    """Aviso manual da chegada é válido; aviso de espera sem oferta não é."""
    x = fixture()
    sql = Path("tests/sql/fila-ofertas-preflight-leitura.sql").read_text(encoding="utf-8")
    walkin = uuid.uuid4()
    with db() as c:
        c.execute(
            """INSERT INTO public.fila_de_espera
               (id,tenant_id,cliente_id,status,janela_preferida,avisado_em)
               VALUES (%s,%s,%s,'avisado',NULL,now())""",
            (walkin, x["tenant"], x["client1"]),
        )
        valid_cur = c.execute(sql)
        columns = [col.name for col in valid_cur.description]
        valid = dict(zip(columns, valid_cur.fetchone()))
        assert valid["pronto_para_revisao"] is True, valid
        assert valid["avisados_sem_oferta"] == 0, valid

        c.execute(
            "UPDATE public.fila_de_espera SET status='avisado' WHERE id=%s",
            (x["entry1"],),
        )
        invalid_cur = c.execute(sql)
        invalid = dict(zip(columns, invalid_cur.fetchone()))
        assert invalid["pronto_para_revisao"] is False, invalid
        assert invalid["avisados_sem_oferta"] == 1, invalid
        c.rollback()  # Nunca deixar a entrada propositalmente inconsistente.


def test_manual_conversion_rejects_unrelated_appointment():
    """Não vincular agendamento alheio do mesmo tenant ao converter a fila."""
    x = fixture()
    unrelated_id = uuid.uuid4()
    with db() as c:
        c.execute(
            """INSERT INTO public.agendamentos(
                 id,tenant_id,cliente_id,profissional_id,servico_id,
                 inicio,fim,status
               ) VALUES (%s,%s,%s,%s,%s,%s,%s,'agendado')""",
            (
                unrelated_id, x["tenant"], x["client2"], x["prof"],
                x["service"], START + timedelta(days=1), END + timedelta(days=1),
            ),
        )
        c.commit()
        c.execute(
            "SELECT set_config('test.fila_id_agendamento_inesperado', %s, true)",
            (str(unrelated_id),),
        )
        try:
            convert(c, x)
        except psycopg.errors.RaiseException as exc:
            assert "agendamento não corresponde à conversão da fila" in str(exc)
            c.rollback()
        else:
            raise AssertionError("Conversão vinculou agendamento de outro cliente")
    assert scalar(
        "SELECT origem_fila_id IS NULL FROM public.agendamentos WHERE id=%s",
        unrelated_id,
    ) is True
    assert scalar(
        "SELECT status FROM public.fila_de_espera WHERE id=%s", x["entry1"]
    ) == "aguardando"


def test_no_offer_for_inactive_professional_or_service():
    """Desativar equipe/catálogo não pode disparar uma oferta da fila."""
    x = fixture()
    with db() as c:
        c.execute(
            "UPDATE public.profissionais SET ativo=false WHERE id=%s",
            (x["prof"],),
        )
        no_prof = reserve(c, x)
        assert no_prof["ok"] is False and no_prof["motivo"] == "profissional_invalido"
        c.execute(
            "UPDATE public.profissionais SET ativo=true WHERE id=%s",
            (x["prof"],),
        )
        c.execute(
            "UPDATE public.servicos SET ativo=false WHERE id=%s",
            (x["service"],),
        )
        no_service = reserve(c, x)
        assert no_service["ok"] is False and no_service["motivo"] == "servico_invalido"
    assert scalar(
        "SELECT count(*) FROM public.ofertas_da_fila WHERE fila_id=%s", x["entry1"]
    ) == 0
    assert scalar(
        "SELECT status FROM public.fila_de_espera WHERE id=%s", x["entry1"]
    ) == "aguardando"


CASES = [
    test_two_slots_one_entry,
    test_one_slot_two_entries,
    test_accept_vs_decline,
    test_old_decline_cannot_release_new_offer,
    test_remove_vs_reserve,
    test_convert_vs_reserve,
    test_two_manual_conversions,
    test_manual_conversion_rejects_unrelated_appointment,
    test_no_offer_for_inactive_professional_or_service,
    test_expire_vs_accept,
    test_tenant_isolation,
    test_walk_in_queue_without_offer,
    test_preflight_manual_walkin_vs_corrupt_waitlist,
    test_idempotent_accept,
    test_no_server_claim,
]

if __name__ == "__main__":
    for fn in CASES:
        fn()
        assert_integrity()
        print(f"PASS: {fn.__name__}", flush=True)
    print(f"PASS: {len(CASES)} casos PostgreSQL em conexões distintas (bancada mínima)", flush=True)
