#!/usr/bin/env python3
"""E2E HTTP: JWT fictício -> PostgREST -> RPC real -> RLS PostgreSQL 17.

Só se conecta ao PostgREST em localhost:3000 e ao Postgres descartável do
GitHub Actions. Nunca usa chaves, usuários ou projetos reais do Supabase.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
import uuid
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from test_pacotes_atomico_postgres import admin, fixture, records

BASE = os.environ.get("TEST_POSTGREST_URL", "http://127.0.0.1:3000")
SECRET = os.environ.get("TEST_JWT_SECRET", "")
if len(SECRET) < 32:
    raise RuntimeError("Use exclusivamente um TEST_JWT_SECRET fictício com 32+ caracteres.")


def b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def jwt(user: uuid.UUID, *, role: str = "authenticated") -> str:
    now = int(time.time())
    header = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    claims = b64url(json.dumps({
        "sub": str(user), "role": role, "iat": now - 5, "exp": now + 1800,
    }).encode())
    signed = (header + "." + claims).encode()
    sig = b64url(hmac.new(SECRET.encode(), signed, hashlib.sha256).digest())
    return signed.decode() + "." + sig


def http(method: str, path: str, body: dict | None = None, token: str | None = None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body, ensure_ascii=False).encode()
    request = Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=12) as res:
            status = res.status
            raw = res.read().decode()
    except HTTPError as exc:
        status = exc.code
        raw = exc.read().decode()
    try:
        parsed = json.loads(raw) if raw else None
    except ValueError:
        parsed = {"_unparsed": raw[:300]}
    return status, parsed


def payload(x: dict, *, pid: uuid.UUID | None = None, tenant=None,
            kind="combo", name="Combo de teste HTTP", price=3200,
            included=None, validity=None):
    if included is None:
        included = [
            {"servicoId": str(x["s1"]), "quantidade": 1},
            {"servicoId": str(x["s2"]), "quantidade": 1},
        ]
    return {
        "_tenant_id": str(x["tenant"] if tenant is None else tenant),
        "_pacote_id": str(pid) if pid else None,
        "_tipo": kind,
        "_nome": name,
        "_descricao": None,
        "_preco_centavos": price,
        "_validade_dias": validity,
        "_destaque": False,
        "_ativo": True,
        "_itens": included,
    }


def verify():
    x = fixture()
    owner = jwt(x["user"])
    outsider = jwt(x["other_user"])

    # Cenário 1: anônimo não deve executar a RPC.
    status, response = http("POST", "/rpc/salvar_pacote_atomico", payload(x))
    assert status in (401, 403), (status, response)
    print("PASS: 1/11 anônimo bloqueado", flush=True)

    # Cenário 2: JWT autenticado do membro autorizado cria conjunto no banco.
    status, response = http("POST", "/rpc/salvar_pacote_atomico", payload(x), owner)
    assert status == 200, (status, response)
    pid = uuid.UUID(response)
    assert records(pid)[0][2] == "Combo de teste HTTP"
    assert len(records(pid)[1]) == 2
    print("PASS: 2/11 criação autenticada por HTTP", flush=True)

    # Cenário 3: a mesma sessão JWT lê via REST o pacote criado.
    route = "/pacotes?" + urlencode({"select": "id,tenant_id,nome", "id": "eq." + str(pid)})
    status, response = http("GET", route, token=owner)
    assert status == 200, (status, response)
    assert len(response) == 1 and response[0]["id"] == str(pid), response
    print("PASS: 3/11 GET autenticado e persistência", flush=True)

    # Cenário 4: pessoa de outro tenant NÃO enxerga o catálogo da primeira.
    status, response = http("GET", route, token=outsider)
    assert status == 200 and response == [], (status, response)
    print("PASS: 4/11 RLS impede leitura de outro negócio", flush=True)

    # Cenário 5: JWT válido de outro tenant não pode gravar.
    status, response = http("POST", "/rpc/salvar_pacote_atomico", payload(x), outsider)
    assert status in (401, 403), (status, response)
    print("PASS: 5/11 JWT sem permissão é recusado", flush=True)

    # Cenário 6: dono edita pacote real; mesma identidade, dados persistentes.
    status, response = http(
        "POST", "/rpc/salvar_pacote_atomico",
        payload(x, pid=pid, name="Editado pelo HTTP", price=3400), owner,
    )
    assert status == 200 and response == str(pid), (status, response)
    assert records(pid)[0][2] == "Editado pelo HTTP"
    print("PASS: 6/11 edição autenticada", flush=True)

    # Cenário 7: preço superior ao catálogo retorna erro, sem gravação parcial.
    old = records(pid)
    status, response = http(
        "POST", "/rpc/salvar_pacote_atomico",
        payload(x, pid=pid, name="Não deve salvar", price=3601), owner,
    )
    assert status >= 400 and response.get("code") == "22023", (status, response)
    assert records(pid) == old
    print("PASS: 7/11 preço ilegal sem gravação", flush=True)

    # Cenário 8: combo não pode pedir várias visitas para o mesmo serviço.
    invalid = [{"servicoId": str(x["s1"]), "quantidade": 2}]
    status, response = http(
        "POST", "/rpc/salvar_pacote_atomico",
        payload(x, pid=pid, included=invalid, price=1000), owner,
    )
    assert status >= 400 and response.get("code") == "22023", (status, response)
    assert records(pid) == old
    print("PASS: 8/11 combo de múltiplas visitas rejeitado", flush=True)

    # Cenário 9: o mesmo JWT não pode passar outro tenant arbitrário.
    status, response = http(
        "POST", "/rpc/salvar_pacote_atomico",
        payload(x, pid=pid, tenant=x["other_tenant"]), owner,
    )
    assert status in (401, 403), (status, response)
    assert records(pid) == old
    print("PASS: 9/11 tenant da RPC não é controlado pelo cliente", flush=True)

    # Cenário 10: serviço de outro estabelecimento não é aceito.
    invalid = [{"servicoId": str(x["other_service"]), "quantidade": 1}]
    status, response = http(
        "POST", "/rpc/salvar_pacote_atomico",
        payload(x, pid=pid, included=invalid, price=1000), owner,
    )
    assert status >= 400 and response.get("code") == "22023", (status, response)
    assert records(pid) == old
    print("PASS: 10/11 serviço estrangeiro rejeitado", flush=True)

    # Cenário 11: reenviar uma EDIÇÃO com o mesmo ID não duplica os itens.
    status, response = http(
        "POST", "/rpc/salvar_pacote_atomico",
        payload(x, pid=pid, name="Editado pelo HTTP", price=3400), owner,
    )
    assert status == 200 and response == str(pid), (status, response)
    assert records(pid) == old and len(records(pid)[1]) == 2
    print("PASS: 11/11 edição repetida sem duplicação de itens", flush=True)

    with admin() as conn:
        count = conn.execute(
            "SELECT COUNT(*) FROM public.pacotes WHERE tenant_id=%s", (x["tenant"],)
        ).fetchone()[0]
    assert count == 1, count
    print("PASS: 11/11 cenários HTTP/JWT/PostgREST/RLS/RPC, PostgreSQL efêmero", flush=True)


if __name__ == "__main__":
    verify()
