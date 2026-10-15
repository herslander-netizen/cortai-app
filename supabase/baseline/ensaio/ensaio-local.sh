#!/usr/bin/env bash
# Ensaio local e descartável do banco: cria um Postgres temporário com uma imitação mínima
# do Supabase, aplica as migrações Supabase (menos as de pular-no-banco-novo.txt) e Drizzle
# em ordem, e roda os testes de supabase/tests. Não conecta em nenhum banco remoto.
# Uso: supabase/baseline/ensaio/ensaio-local.sh   (precisa de initdb/pg_ctl/psql do Postgres)
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../../.." && pwd)"
AQUI="$RAIZ/supabase/baseline/ensaio"
PGBIN="${PGBIN:-$(dirname "$(command -v initdb || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
DIR="$(mktemp -d)"; PORTA="${PORTA:-54329}"
[ "$(id -u)" = 0 ] && { chown postgres "$DIR"; COMO="su postgres -c"; } || COMO="bash -c"
$COMO "$PGBIN/initdb -D $DIR/data -U postgres -A trust >/dev/null && $PGBIN/pg_ctl -D $DIR/data -o '-p $PORTA -k $DIR' -l $DIR/log start >/dev/null" || exit 1
trap '$COMO "$PGBIN/pg_ctl -D $DIR/data stop -m fast >/dev/null"; rm -rf "$DIR"' EXIT
PSQL=(psql -h "$DIR" -p "$PORTA" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$AQUI/imitacao-supabase.sql" >/dev/null 2>&1 || { echo "falhou a imitação do Supabase"; exit 1; }
"${PSQL[@]}" -c "alter database postgres set search_path = public, extensions" >/dev/null
# pg_cron e pg_net não existem no Postgres local: a imitação cria os esquemas cron/net no lugar.
aplicar() { { echo "set check_function_bodies = off;"; sed -E 's/--> statement-breakpoint//; /create extension (if not exists )?(pg_net|pg_cron)/Id' "$1"; } | "${PSQL[@]}" -1 2>&1 | grep -E 'ERROR|DETAIL' | head -3; return "${PIPESTATUS[1]}"; }
n=0; pulos=0
for f in "$RAIZ"/supabase/migrations/*.sql; do
  p="$(basename "$f" | cut -c1-14)"
  if grep -q "^$p " "$AQUI/pular-no-banco-novo.txt"; then pulos=$((pulos+1)); continue; fi
  aplicar "$f" || { echo "FALHOU: $(basename "$f")"; exit 1; }; n=$((n+1))
done
echo "Supabase: $n aplicadas, $pulos puladas"
d=0; for f in "$RAIZ"/drizzle/migrations/0*.sql; do aplicar "$f" || { echo "FALHOU: $(basename "$f")"; exit 1; }; d=$((d+1)); done
echo "Drizzle: $d aplicadas"
for t in "$RAIZ"/supabase/tests/*.sql; do
  echo "== teste $(basename "$t")"; "${PSQL[@]}" -f "$t" 2>&1 | grep -E 'OK|FALHOU|ERROR|NOTICE' | sed 's/^psql:[^ ]* //' | head -3
done
