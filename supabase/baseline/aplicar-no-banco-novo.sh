#!/usr/bin/env bash
# Aplica no banco NOVO e VAZIO a mesma sequência do ensaio local (supabase/baseline/ensaio):
# migrações Supabase em ordem (menos as de pular-no-banco-novo.txt) e depois as Drizzle,
# cada uma numa transação, com check_function_bodies = off. Para no primeiro erro.
# Depois roda supabase/baseline/baseline_verification.sql e supabase/tests (que desfazem tudo).
#
# Uso: BANCO_URL='postgresql://...' PROJETO_ESPERADO=ibsberidejlbczxrweqg \
#      URL_DO_APP='https://...workers.dev' supabase/baseline/aplicar-no-banco-novo.sh
# Proteções: só aceita a URL do projeto esperado e só roda se o esquema public estiver vazio.
# As migrações chamam https://cortai.dev (tarefas agendadas e avisos de push). Aqui esse
# endereço é trocado por URL_DO_APP na hora de aplicar, para o banco novo não chamar a
# produção antiga. Os arquivos das migrações não mudam.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
PULAR="$RAIZ/supabase/baseline/ensaio/pular-no-banco-novo.txt"
: "${BANCO_URL:?defina BANCO_URL}"; : "${PROJETO_ESPERADO:?defina PROJETO_ESPERADO}"; : "${URL_DO_APP:?defina URL_DO_APP}"
case "$URL_DO_APP" in https://*) ;; *) echo "URL_DO_APP precisa começar com https://"; exit 1 ;; esac
URL_DO_APP="${URL_DO_APP%/}"

case "$BANCO_URL" in
  *"$PROJETO_ESPERADO"*) ;;
  *) echo "Recusado: a URL do banco não é do projeto $PROJETO_ESPERADO."; exit 1 ;;
esac

PSQL=(psql "$BANCO_URL" -v ON_ERROR_STOP=1 -q -X)
tabelas="$("${PSQL[@]}" -At -c "select count(*) from pg_tables where schemaname = 'public'")" || { echo "Não conectou no banco."; exit 1; }
if [ "$tabelas" != "0" ]; then
  echo "Recusado: o esquema public já tem $tabelas tabelas. Este script só monta banco vazio."
  exit 1
fi

# Tudo vai numa transação só: se qualquer migração falhar, nada fica gravado.
# Por isso saem as linhas BEGIN;/COMMIT; que algumas migrações têm por conta própria.
# ENSAIO_SEM_EXTENSOES=1 tira pg_cron/pg_net (só para testar o script num Postgres local).
preparar() {
  local regras=(-e 's/--> statement-breakpoint//' -e '/^[[:space:]]*(BEGIN|COMMIT)[[:space:]]*;[[:space:]]*$/Id'
    -e "s#https://cortai\.dev/api/#$URL_DO_APP/api/#g")
  [ "${ENSAIO_SEM_EXTENSOES:-0}" = 1 ] && regras+=(-e '/create extension (if not exists )?(pg_net|pg_cron)/Id')
  sed -E "${regras[@]}" "$1"
}

LOTE="$(mktemp)"; trap 'rm -f "$LOTE"' EXIT
{
  echo "begin;"
  echo "set local check_function_bodies = off;"
  for f in "$RAIZ"/supabase/migrations/*.sql; do
    p="$(basename "$f" | cut -c1-14)"
    if grep -q "^$p " "$PULAR"; then echo "\\echo 'pulada: $(basename "$f")'"; continue; fi
    echo "\\echo 'aplicando: $(basename "$f")'"; preparar "$f"; echo ";"
  done
  for f in "$RAIZ"/drizzle/migrations/0*.sql; do
    echo "\\echo 'aplicando: drizzle/$(basename "$f")'"; preparar "$f"; echo ";"
  done
  echo "commit;"
} > "$LOTE"

if ! saida="$("${PSQL[@]}" -f "$LOTE" 2>&1)"; then
  echo "$saida" | grep -E "aplicando|pulada" | tail -1
  echo "$saida" | grep -E 'ERROR|DETAIL|HINT' | head -5
  echo "FALHOU. Nada foi gravado (a transação foi desfeita)."
  exit 1
fi
echo "$saida" | grep -c "aplicando" | xargs echo "migrações aplicadas:"
echo "$saida" | grep -c "pulada" | xargs echo "migrações puladas:"

echo "== verificação"
"${PSQL[@]}" -f "$RAIZ/supabase/baseline/baseline_verification.sql" 2>&1 | tail -40
for t in "$RAIZ"/supabase/tests/*.sql; do
  echo "== teste $(basename "$t")"
  "${PSQL[@]}" -f "$t" 2>&1 | grep -E 'OK|FALHOU|ERROR|NOTICE' | head -3
done
