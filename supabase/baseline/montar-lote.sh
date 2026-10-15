#!/usr/bin/env bash
# Monta, na saída padrão, o pacote único de migrações do banco novo: Supabase em ordem (menos
# pular-no-banco-novo.txt) e depois Drizzle, numa transação só, com check_function_bodies = off.
# Tira os BEGIN;/COMMIT; próprios de algumas migrações e troca https://cortai.dev/api/ por
# URL_DO_APP. MODO=psql inclui marcadores \echo (só o psql entende); MODO=api usa comentários.
# ENSAIO_SEM_EXTENSOES=1 tira pg_cron/pg_net (só para testar num Postgres local).
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
PULAR="$RAIZ/supabase/baseline/ensaio/pular-no-banco-novo.txt"
: "${URL_DO_APP:?defina URL_DO_APP}"
MODO="${MODO:-psql}"

marcar() { if [ "$MODO" = psql ]; then echo "\\echo '$1'"; else echo "-- $1"; fi; }
preparar() {
  local regras=(-e 's/--> statement-breakpoint//' -e '/^[[:space:]]*(BEGIN|COMMIT)[[:space:]]*;[[:space:]]*$/Id'
    -e "s#https://cortai\.dev/api/#$URL_DO_APP/api/#g")
  [ "${ENSAIO_SEM_EXTENSOES:-0}" = 1 ] && regras+=(-e '/create extension (if not exists )?(pg_net|pg_cron)/Id')
  sed -E "${regras[@]}" "$1"
}

echo "begin;"
echo "set local check_function_bodies = off;"
for f in "$RAIZ"/supabase/migrations/*.sql; do
  p="$(basename "$f" | cut -c1-14)"
  if grep -q "^$p " "$PULAR"; then marcar "pulada: $(basename "$f")"; continue; fi
  marcar "aplicando: $(basename "$f")"; preparar "$f"; echo ";"
done
for f in "$RAIZ"/drizzle/migrations/0*.sql; do
  marcar "aplicando: drizzle/$(basename "$f")"; preparar "$f"; echo ";"
done
echo "commit;"
