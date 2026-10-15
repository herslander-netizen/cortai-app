#!/usr/bin/env bash
# Mesma montagem de aplicar-no-banco-novo.sh, mas pela API de gerenciamento do Supabase,
# com um token de acesso (sbp_...) em vez da senha do banco.
# Uso: SUPABASE_ACCESS_TOKEN=sbp_... PROJETO_ESPERADO=ibsberidejlbczxrweqg \
#      URL_DO_APP='https://...workers.dev' supabase/baseline/aplicar-pela-api.sh
# Proteções: o projeto é fixo, o esquema public precisa estar vazio e tudo vai numa
# transação só (se qualquer migração falhar, nada fica gravado).
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
: "${SUPABASE_ACCESS_TOKEN:?defina SUPABASE_ACCESS_TOKEN}"; : "${PROJETO_ESPERADO:?defina PROJETO_ESPERADO}"
: "${URL_DO_APP:?defina URL_DO_APP}"
case "$URL_DO_APP" in https://*) ;; *) echo "URL_DO_APP precisa começar com https://"; exit 1 ;; esac
export URL_DO_APP="${URL_DO_APP%/}"
TOKEN="$(printf '%s' "$SUPABASE_ACCESS_TOKEN" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
case "$TOKEN" in sbp_*) ;; *) echo "O token precisa começar com sbp_ (token de acesso da conta, não a chave do projeto)."; exit 1 ;; esac
API="https://api.supabase.com/v1/projects/$PROJETO_ESPERADO/database/query"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# Roda o SQL de um arquivo; resposta em $TMP/resposta.json e status HTTP na saída.
consultar() {
  jq -Rs '{query: .}' < "$1" > "$TMP/corpo.json"
  curl -sS -o "$TMP/resposta.json" -w '%{http_code}' -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    --data-binary @"$TMP/corpo.json"
}
valor() { printf '%s' "$1" > "$TMP/q.sql"; consultar "$TMP/q.sql" >/dev/null; jq -r '.[0] | to_entries[0].value // empty' "$TMP/resposta.json" 2>/dev/null; }

status="$(printf 'select count(*) as n from pg_tables where schemaname = %s' "'public'" > "$TMP/q.sql"; consultar "$TMP/q.sql")"
if [ "$status" != 200 ] && [ "$status" != 201 ]; then
  echo "Não conectou pela API (HTTP $status): $(head -c 300 "$TMP/resposta.json")"; exit 1
fi
tabelas="$(jq -r '.[0].n' "$TMP/resposta.json")"
if [ "$tabelas" != "0" ]; then
  echo "Recusado: o esquema public já tem $tabelas tabelas. Este script só monta banco vazio."; exit 1
fi

MODO=api "$RAIZ/supabase/baseline/montar-lote.sh" > "$TMP/lote.sql"
echo "pacote: $(grep -c '^-- aplicando:' "$TMP/lote.sql") migrações, $(grep -c '^-- pulada:' "$TMP/lote.sql") puladas, $(wc -c < "$TMP/lote.sql") bytes"
status="$(consultar "$TMP/lote.sql")"
if [ "$status" != 200 ] && [ "$status" != 201 ]; then
  echo "FALHOU (HTTP $status): $(head -c 600 "$TMP/resposta.json")"
  echo "tabelas em public depois da falha: $(valor "select count(*) from pg_tables where schemaname = 'public'") (0 = nada gravado)"
  exit 1
fi
echo "migrações aplicadas."

echo "== verificação"
echo "tabelas em public: $(valor "select count(*) from pg_tables where schemaname = 'public'")"
echo "tabelas sem RLS: $(valor "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity")"
echo "funções SECURITY DEFINER executáveis por anon: $(valor "select coalesce(string_agg(p.proname, ', '), 'nenhuma') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE')")"
echo "tarefas agendadas: $(valor "select string_agg(jobname || ' ' || schedule || case when command ilike '%cortai.dev%' then ' (APONTA PARA cortai.dev!)' else '' end, '; ') from cron.job")"
for t in "$RAIZ"/supabase/tests/*.sql; do
  consultar "$t" >/dev/null
  echo "== teste $(basename "$t"): $(jq -r '.message // .error // "sem mensagem"' "$TMP/resposta.json" 2>/dev/null | grep -oE '(RBAC (OK|FALHOU)[^"]*|COMANDA[^"]*|sem agendamento[^"]*)' | head -1)"
done
