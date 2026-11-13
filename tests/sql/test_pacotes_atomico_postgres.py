#!/usr/bin/env python3
"""Teste real da RPC proposta, em PostgreSQL descartável com RLS e duas sessões.

Usa a migração REAL 0046 para tabelas/índices/RLS; apenas as dependências
externas (tenant, auth.uid, permissões, serviços) são fixtures mínimas.
NUNCA usar uma string de conexão Supabase: só TEST_DATABASE_URL do Actions.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import json
import os
import time
import uuid

import psycopg

DSN = os.environ["TEST_DATABASE_URL"]
SQL = (
    "SELECT public.salvar_pacote_atomico("
    "%s::uuid,%s::uuid,%s::text,%s::text,%s::text,"
    "%s::integer,%s::integer,%s::boolean,%s::boolean,%s::jsonb)"
)
SIGNATURE = (
    "public.salvar_pacote_atomico("
    "uuid,uuid,text,text,text,integer,integer,boolean,boolean,jsonb)"
)


def admin():
    c = psycopg.connect(DSN, connect_timeout=8)
    c.execute("SET statement_timeout='15s'")
    c.commit()
    return c


def member(user: uuid.UUID, role: str = "authenticated"):
    c = psycopg.connect(DSN, connect_timeout=8)
    c.execute("SET statement_timeout='15s'")
    c.execute("SET lock_timeout='10s'")
    c.execute("SET ROLE " + role)
    c.execute("SELECT set_config('request.jwt.claim.sub', %s, false)", (str(user),))
    c.commit()
    return c


def fixture():
    x = {name: uuid.uuid4() for name in (
        "tenant", "other_tenant", "user", "other_user",
        "s1", "s2", "other_service",
    )}
    with admin() as c:
        for tid in (x["tenant"], x["other_tenant"]):
            c.execute("INSERT INTO public.tenants (id) VALUES (%s)", (tid,))
        for tenant, user in (("tenant", "user"), ("other_tenant", "other_user")):
            c.execute(
                "INSERT INTO public.memberships (tenant_id,user_id,allowed) VALUES (%s,%s,true)",
                (x[tenant], x[user]),
            )
        for sid, tenant, price in (
            ("s1", "tenant", 1200), ("s2", "tenant", 2400),
            ("other_service", "other_tenant", 5000),
        ):
            c.execute(
                """INSERT INTO public.servicos (id,tenant_id,nome,preco_centavos)
                VALUES (%s,%s,'Serviço fictício',%s)""",
                (x[sid], x[tenant], price),
            )
    return x


def items(x, first=1, second=1):
    return [
        {"servicoId": str(x["s1"]), "quantidade": first},
        {"servicoId": str(x["s2"]), "quantidade": second},
    ]


def save(c, x, *, tenant=None, pid=None, kind="combo", name="Pacote teste",
         price=3100, validity=None, included=None, active=True):
    if included is None:
        included = items(x)
    return c.execute(
        SQL,
        (
            tenant if tenant is not None else x["tenant"],
            pid,
            kind,
            name,
            None,
            price,
            validity,
            False,
            active,
            json.dumps(included),
        ),
    ).fetchone()[0]


def records(pid):
    with admin() as c:
        header = c.execute(
            "SELECT tenant_id,tipo,nome,preco_centavos FROM public.pacotes WHERE id=%s",
            (pid,),
        ).fetchone()
        detail = c.execute(
            """SELECT servico_id,quantidade FROM public.pacote_itens
               WHERE pacote_id=%s ORDER BY servico_id""",
            (pid,),
        ).fetchall()
    return header, detail


def test_create_and_update():
    x = fixture()
    with member(x["user"]) as c:
        pid = save(c, x)
        assert isinstance(pid, uuid.UUID)
        same = save(
            c, x, pid=pid, kind="pacote", name="Pacote atualizado",
            price=5100, validity=30, included=items(x, 2, 2),
        )
        assert pid == same
    header, detail = records(pid)
    assert header[1:] == ("pacote", "Pacote atualizado", 5100)
    assert sorted(q for _, q in detail) == [2, 2]


def test_repeat_update_is_safe():
    x = fixture()
    with member(x["user"]) as c:
        pid = save(c, x)
        for _ in range(3):
            assert save(c, x, pid=pid) == pid
    assert len(records(pid)[1]) == 2


def test_price_over_limit_no_write():
    x = fixture()
    with member(x["user"]) as c:
        try:
            save(c, x, price=3601)
        except psycopg.Error as e:
            assert e.sqlstate == "22023"
            c.rollback()
        else:
            raise AssertionError("Preço maior que avulso foi aceito")
    with admin() as c:
        assert c.execute(
            "SELECT COUNT(*) FROM public.pacotes WHERE tenant_id=%s", (x["tenant"],)
        ).fetchone()[0] == 0


def test_combo_requires_single_visit():
    x = fixture()
    with member(x["user"]) as c:
        try:
            save(c, x, included=items(x, 2, 1))
        except psycopg.Error as e:
            assert e.sqlstate == "22023"
            c.rollback()
        else:
            raise AssertionError("Combo com várias unidades não foi recusado")


def test_duplicate_services_rejected():
    x = fixture()
    invalid = [{"servicoId": str(x["s1"]), "quantidade": 1}] * 2
    with member(x["user"]) as c:
        try:
            save(c, x, included=invalid)
        except psycopg.Error as e:
            assert e.sqlstate == "22023"
            c.rollback()
        else:
            raise AssertionError("Serviço duplicado foi aceito")


def test_cross_tenant_service_rejected():
    x = fixture()
    invalid = [{"servicoId": str(x["other_service"]), "quantidade": 1}]
    with member(x["user"]) as c:
        try:
            save(c, x, included=invalid, price=1000)
        except psycopg.Error as e:
            assert e.sqlstate == "22023"
            c.rollback()
        else:
            raise AssertionError("Serviço de outro tenant foi aceito")


def test_cross_tenant_package_edit_rejected():
    x = fixture()
    with member(x["other_user"]) as other:
        foreign = save(other, x, tenant=x["other_tenant"],
                       included=[{"servicoId": str(x["other_service"]), "quantidade": 1}],
                       price=4000)
    with member(x["user"]) as c:
        try:
            save(c, x, pid=foreign, name="Alteração indevida")
        except psycopg.Error as e:
            assert e.sqlstate == "22023"
            c.rollback()
        else:
            raise AssertionError("Edição de pacote alheio foi aceita")
    assert records(foreign)[0][2] == "Pacote teste"


def test_user_without_tenant_permission_rejected():
    x = fixture()
    with member(x["other_user"]) as c:
        try:
            save(c, x)
        except psycopg.Error as e:
            assert e.sqlstate == "42501"
            c.rollback()
        else:
            raise AssertionError("Usuário sem permissão gravou pacote")


def test_anon_cannot_execute_and_function_invoker():
    x = fixture()
    with admin() as c:
        can_anon = c.execute(
            "SELECT has_function_privilege('anon', %s, 'EXECUTE')", (SIGNATURE,)
        ).fetchone()[0]
        can_auth = c.execute(
            "SELECT has_function_privilege('authenticated', %s, 'EXECUTE')",
            (SIGNATURE,),
        ).fetchone()[0]
        can_service = c.execute(
            "SELECT has_function_privilege('service_role', %s, 'EXECUTE')",
            (SIGNATURE,),
        ).fetchone()[0]
        invoker = c.execute(
            """SELECT NOT prosecdef FROM pg_proc
               WHERE oid=%s::regprocedure""", (SIGNATURE,),
        ).fetchone()[0]
    assert not can_anon and can_auth and not can_service and invoker
    with member(x["user"], role="anon") as c:
        try:
            save(c, x)
        except psycopg.Error as e:
            assert e.sqlstate == "42501"
            c.rollback()
        else:
            raise AssertionError("Anon executou a RPC")


def test_rollback_after_delete_of_old_items():
    x = fixture()
    with member(x["user"]) as c:
        pid = save(c, x, name="Original")
    original = records(pid)
    with member(x["user"]) as c:
        c.execute("SELECT set_config('test.falhar_item', 'on', true)")
        try:
            save(c, x, pid=pid, name="Tentativa com falha", price=1000,
                 included=[{"servicoId": str(x["s1"]), "quantidade": 1}])
        except psycopg.Error as e:
            assert e.sqlstate == "P0001"
            c.rollback()
        else:
            raise AssertionError("O trigger de falha não funcionou")
    assert records(pid) == original, "Rollback não restaurou os itens antigos"


def test_rollback_on_create_failure():
    x = fixture()
    with member(x["user"]) as c:
        c.execute("SELECT set_config('test.falhar_item', 'on', true)")
        try:
            save(c, x, name="Novo que deve falhar")
        except psycopg.Error as e:
            assert e.sqlstate == "P0001"
            c.rollback()
        else:
            raise AssertionError("Insert artificialmente falho foi aceito")
    with admin() as c:
        assert c.execute(
            "SELECT COUNT(*) FROM public.pacotes WHERE tenant_id=%s", (x["tenant"],)
        ).fetchone()[0] == 0, "Criou pai sem itens após falha"


def test_race_two_connections_same_package():
    x = fixture()
    with member(x["user"]) as c:
        pid = save(c, x)
    a = member(x["user"])
    b = member(x["user"])
    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            one = save(
                a, x, pid=pid, name="Primeira",
                included=[{"servicoId": str(x["s1"]), "quantidade": 1}],
                price=1000,
            )
            assert one == pid
            future = pool.submit(
                save, b, x, pid=pid, name="Segunda",
                included=[{"servicoId": str(x["s2"]), "quantidade": 1}],
                price=2000,
            )
            time.sleep(0.35)
            assert not future.done(), "Operação B deveria aguardar o lock da A"
            with admin() as inspector:
                waiting = inspector.execute(
                    """SELECT count(*) FROM pg_stat_activity
                       WHERE pid=%s AND wait_event_type='Lock'""",
                    (b.info.backend_pid,),
                ).fetchone()[0]
            assert waiting == 1, "B não aguardou lock PostgreSQL real"
            a.commit()
            assert future.result(timeout=10) == pid
            b.commit()
    finally:
        a.rollback()
        b.rollback()
        a.close()
        b.close()
    header, detail = records(pid)
    assert header[2] == "Segunda"
    assert detail == [(x["s2"], 1)], "Concorrência misturou itens das duas edições"


CASES = [
    test_create_and_update,
    test_repeat_update_is_safe,
    test_price_over_limit_no_write,
    test_combo_requires_single_visit,
    test_duplicate_services_rejected,
    test_cross_tenant_service_rejected,
    test_cross_tenant_package_edit_rejected,
    test_user_without_tenant_permission_rejected,
    test_anon_cannot_execute_and_function_invoker,
    test_rollback_after_delete_of_old_items,
    test_rollback_on_create_failure,
    test_race_two_connections_same_package,
]

if __name__ == "__main__":
    for fn in CASES:
        fn()
        print(f"PASS: {fn.__name__}", flush=True)
    print(f"PASS: {len(CASES)} cenários PostgreSQL/RLS/rollback/concorrrência", flush=True)
