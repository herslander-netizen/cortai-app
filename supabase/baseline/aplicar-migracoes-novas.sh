#!/usr/bin/env bash
# Aplica migrações novas num banco JÁ montado, pela API de gerenciamento do Supabase
# (token sbp_). Cada arquivo vai numa transação própria, com check_function_bodies = off
# e https://cortai.dev/api/ trocado por URL_DO_APP (como na montagem). O registro fica em
# cortai_controle.migracoes_aplicadas (esquema fora da API pública): arquivo já registrado
# é pulado. Para no primeiro erro; o arquivo que falhou não fica gravado.
# Uso: SUPABASE_ACCESS_TOKEN=sbp_... PROJETO_ESPERADO=<ref> URL_DO_APP=https://... \
#      supabase/baseline/aplicar-migracoes-novas.sh drizzle/migrations/0029_x.sql [...]
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
: "${SUPABASE_ACCESS_TOKEN:?defina SUPABASE_ACCESS_TOKEN}"; : "${PROJETO_ESPERADO:?defina PROJETO_ESPERADO}"
: "${URL_DO_APP:?defina URL_DO_APP}"
case "$URL_DO_APP" in https://*) ;; *) echo "URL_DO_APP precisa começar com https://"; exit 1 ;; esac
URL_DO_APP="${URL_DO_APP%/}"
TOKEN="$(printf '%s' "$SUPABASE_ACCESS_TOKEN" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
case "$TOKEN" in sbp_*) ;; *) echo "O token precisa começar com sbp_."; exit 1 ;; esac
[ "$#" -gt 0 ] || { echo "Informe ao menos um arquivo de migração."; exit 1; }
API="https://api.supabase.com/v1/projects/$PROJETO_ESPERADO/database/query"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

consultar() {
  jq -Rs '{query: .}' < "$1" > "$TMP/corpo.json"
  curl -sS -o "$TMP/resposta.json" -w '%{http_code}' -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data-binary @"$TMP/corpo.json"
}
sql() { printf '%s' "$1" > "$TMP/q.sql"; s="$(consultar "$TMP/q.sql")"; [ "$s" = 200 ] || [ "$s" = 201 ]; }

# Os arquivos precisam existir nas pastas de migração do repositório.
for a in "$@"; do
  case "$a" in supabase/migrations/*.sql|drizzle/migrations/*.sql) ;; *) echo "Recusado: $a não é uma migração do repositório."; exit 1 ;; esac
  [ -f "$RAIZ/$a" ] || { echo "Recusado: $a não existe."; exit 1; }
done

# O banco precisa estar montado (esta automação não substitui a montagem do zero).
sql "select count(*) as n from pg_tables where schemaname = 'public'" || { echo "Não conectou pela API: $(head -c 300 "$TMP/resposta.json")"; exit 1; }
[ "$(jq -r '.[0].n' "$TMP/resposta.json")" != "0" ] || { echo "Recusado: o banco está vazio; use a montagem do zero."; exit 1; }
sql "create schema if not exists cortai_controle; revoke all on schema cortai_controle from public, anon, authenticated; create table if not exists cortai_controle.migracoes_aplicadas (arquivo text primary key, aplicada_em timestamptz not null default now())" \
  || { echo "Falhou ao preparar o registro: $(head -c 300 "$TMP/resposta.json")"; exit 1; }

for a in "$@"; do
  nome="$(basename "$a")"
  sql "select count(*) as n from cortai_controle.migracoes_aplicadas where arquivo = '$nome'"
  if [ "$(jq -r '.[0].n' "$TMP/resposta.json")" != "0" ]; then echo "já aplicada: $nome"; continue; fi
  {
    echo "begin;"
    echo "set local check_function_bodies = off;"
    sed -E -e 's/--> statement-breakpoint//' -e '/^[[:space:]]*(BEGIN|COMMIT)[[:space:]]*;[[:space:]]*$/Id' \
      -e "s#https://cortai\.dev/api/#$URL_DO_APP/api/#g" "$RAIZ/$a"
    echo ";"
    echo "insert into cortai_controle.migracoes_aplicadas (arquivo) values ('$nome');"
    echo "commit;"
  } > "$TMP/migracao.sql"
  status="$(consultar "$TMP/migracao.sql")"
  if [ "$status" != 200 ] && [ "$status" != 201 ]; then
    echo "FALHOU em $nome (HTTP $status): $(head -c 600 "$TMP/resposta.json")"
    echo "Este arquivo não ficou gravado; os anteriores desta execução ficaram."
    exit 1
  fi
  echo "aplicada: $nome"
done

for t in "$RAIZ"/supabase/tests/*.sql; do
  consultar "$t" >/dev/null
  echo "== teste $(basename "$t"): $(jq -r '.message // .error // "sem mensagem"' "$TMP/resposta.json" 2>/dev/null | grep -oE '(RBAC (OK|FALHOU)[^"]*|sem agendamento[^"]*)' | head -1)"
done
