#!/usr/bin/env python3
"""PostgREST HTTP + JWT sintético + cinco RPCs REAIS da proposta da fila.

PostgreSQL e PostgREST 100% descartáveis no GitHub Actions, sem chaves e
sem dados do Supabase. O esquema e criar_agendamento ainda são stubs.
Não valida gatilhos, autenticação oficial, RLS real ou WhatsApp.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from test_fila_concorrencia_postgres import START, END, fixture, scalar

BASE = os.environ.get("TEST_POSTGREST_URL", "")
SECRET = os.environ.get("TEST_JWT_SECRET", "")
DB = os.environ.get("TEST_DATABASE_URL", "")
if BASE not in ("http://127.0.0.1:3000", "http://localhost:3000"):
    raise RuntimeError("Fila HTTP só pode usar PostgREST local:3000.")
if "127.0.0.1:5432/" not in DB and "localhost:5432/" not in DB:
    raise RuntimeError("Fila HTTP só pode usar PostgreSQL descartável local.")
if len(SECRET) < 32 or "fixture" not in SECRET:
    raise RuntimeError("JWT só de teste requer segredo fictício.")


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def jwt(role: str) -> str:
    now = int(time.time())
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    claims = b64url(json.dumps({
        "sub": str(uuid.uuid4()), "role": role, "iat": now - 5,
        "exp": now + 900,
    }).encode())
    signed = (header + "." + claims).encode()
    signature = b64url(hmac.new(SECRET.encode(), signed, hashlib.sha256).digest())
    return signed.decode() + "." + signature


def call(name: str, body: dict, token: str | None = None):
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = Request(
        BASE + "/rpc/" + name,
        data=json.dumps(body).encode(), headers=headers, method="POST",
    )
    try:
        with urlopen(req, timeout=12) as response:
            code = response.status
            raw = response.read().decode()
    except HTTPError as err:
        code = err.code
        raw = err.read().decode()
    try:
        data = json.loads(raw) if raw else None
    except ValueError:
        data = {"_unexpected_response": raw[:200]}
    return code, data


def reserve_args(x: dict, *, entry: str = "entry1", slot: str = "slot1",
                 tenant: str = "tenant") -> dict:
    return {
        "_tenant_id": str(x[tenant]), "_fila_id": str(x[entry]),
        "_agendamento_liberado_id": str(x[slot]),
        "_profissional_id": str(x["prof"]),
        "_servico_id": str(x["service"]),
        "_inicio": START.isoformat(), "_fim": END.isoformat(),
        "_expira_em": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
    }


def required_success(name: str, args: dict, token: str):
    status, body = call(name, args, token)
    assert status == 200 and isinstance(body, dict), (name, status, body)
    assert body.get("ok") is True, (name, body)
    return body


def check() -> None:
    x = fixture()
    outsider_jwt = jwt("authenticated")
    server_jwt = jwt("service_role")
    reserve = reserve_args(x)
    sample_token = "c" * 36
    protected = [
        ("reservar_oferta_da_fila", reserve),
        ("encerrar_oferta_da_fila", {
            "_tenant_id": str(x["tenant"]), "_oferta_id": str(uuid.uuid4()),
            "_novo_status": "cancelada",
        }),
        ("aceitar_oferta_da_fila", {"_token": sample_token}),
        ("retirar_entrada_da_fila", {
            "_tenant_id": str(x["tenant"]), "_fila_id": str(x["entry1"]),
        }),
        ("converter_entrada_da_fila", {
            "_tenant_id": str(x["tenant"]), "_fila_id": str(x["entry1"]),
            "_servico_id": str(x["service"]),
            "_profissional_id": str(x["prof"]), "_inicio": START.isoformat(),
        }),
    ]

    # Todas as cinco funções SECURITY DEFINER precisam bloquear ANON e
    # AUTHENTICATED pela API; não basta simular JWT via set_config no psql.
    for name, args in protected:
        for role, token in (("anon", None), ("authenticated", outsider_jwt)):
            status, body = call(name, args, token)
            assert status in (401, 403, 404), (name, role, status, body)
            print(f"PASS: {name} indisponível para {role}", flush=True)
    assert scalar(
        "SELECT count(*) FROM public.ofertas_da_fila WHERE tenant_id=%s", x["tenant"]
    ) == 0
    assert scalar(
        "SELECT status FROM public.fila_de_espera WHERE id=%s", x["entry1"]
    ) == "aguardando"

    # JWT local service_role -> PostgREST -> RPC real -> SQL, sem bypass
    # do fluxo transacional da fila.
    oferta = required_success("reservar_oferta_da_fila", reserve, server_jwt)
    uuid.UUID(oferta["oferta_id"])
    assert len(oferta["token"]) >= 24
    print("PASS: reserva real com token em HTTP", flush=True)

    status, repetida = call("reservar_oferta_da_fila", reserve, server_jwt)
    assert status == 200 and repetida == {
        "ok": False, "motivo": "entrada_indisponivel"
    }, (status, repetida)
    print("PASS: segunda reserva da mesma entrada recusada", flush=True)

    status, cruzada = call("encerrar_oferta_da_fila", {
        "_tenant_id": str(x["other_tenant"]),
        "_oferta_id": oferta["oferta_id"], "_novo_status": "recusada",
    }, server_jwt)
    assert status == 200 and cruzada == {
        "ok": False, "motivo": "oferta_inativa"
    }, (status, cruzada)
    print("PASS: tenant alheio não encerra oferta", flush=True)

    aceite = required_success(
        "aceitar_oferta_da_fila", {"_token": oferta["token"]}, server_jwt
    )
    agendamento_id = uuid.UUID(aceite["agendamento_id"])
    repetido = required_success(
        "aceitar_oferta_da_fila", {"_token": oferta["token"]}, server_jwt
    )
    assert repetido["repetida"] is True
    assert repetido["agendamento_id"] == str(agendamento_id)
    assert scalar(
        "SELECT count(*) FROM public.agendamentos WHERE origem_fila_id=%s",
        x["entry1"],
    ) == 1
    print("PASS: aceite e repetição idempotente sem duplicar agendamento", flush=True)

    y = fixture()
    outra = required_success(
        "reservar_oferta_da_fila", reserve_args(y), server_jwt
    )
    encerrada = required_success("encerrar_oferta_da_fila", {
        "_tenant_id": str(y["tenant"]),
        "_oferta_id": outra["oferta_id"], "_novo_status": "recusada",
    }, server_jwt)
    assert encerrada["liberou_fila"] is True
    status, velho = call(
        "aceitar_oferta_da_fila", {"_token": outra["token"]}, server_jwt
    )
    assert status == 200 and velho["ok"] is False
    assert velho["motivo"] == "recusada"
    assert scalar(
        "SELECT status FROM public.fila_de_espera WHERE id=%s", y["entry1"]
    ) == "aguardando"
    print("PASS: recusa libera somente sua entrada, token antigo não aceita", flush=True)

    z = fixture()
    convertido = required_success("converter_entrada_da_fila", {
        "_tenant_id": str(z["tenant"]), "_fila_id": str(z["entry1"]),
        "_servico_id": str(z["service"]),
        "_profissional_id": str(z["prof"]), "_inicio": START.isoformat(),
    }, server_jwt)
    uuid.UUID(convertido["agendamento_id"])
    status, repetida = call("converter_entrada_da_fila", {
        "_tenant_id": str(z["tenant"]), "_fila_id": str(z["entry1"]),
        "_servico_id": str(z["service"]),
        "_profissional_id": str(z["prof"]), "_inicio": START.isoformat(),
    }, server_jwt)
    assert status == 200 and repetida["ok"] is False
    assert repetida["motivo"] == "entrada_indisponivel"
    print("PASS: conversão manual não gera segundo agendamento", flush=True)

    w = fixture()
    saida = required_success("retirar_entrada_da_fila", {
        "_tenant_id": str(w["tenant"]), "_fila_id": str(w["entry1"]),
    }, server_jwt)
    assert saida["repetida"] is False
    saida2 = required_success("retirar_entrada_da_fila", {
        "_tenant_id": str(w["tenant"]), "_fila_id": str(w["entry1"]),
    }, server_jwt)
    assert saida2["repetida"] is True
    assert scalar(
        "SELECT status FROM public.fila_de_espera WHERE id=%s", w["entry1"]
    ) == "saiu"
    print("PASS: saída da fila é idempotente", flush=True)

    print("PASS: 10 negações e 7 jornadas RPC pelo PostgREST JWT de teste", flush=True)


if __name__ == "__main__":
    check()
