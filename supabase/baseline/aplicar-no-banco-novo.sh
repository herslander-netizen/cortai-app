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

# Diagnóstico do formato da URI, sem nunca mostrar a senha. BANCO_SENHA (opcional) substitui
# a senha da URI e vai por PGPASSWORD, fora da URI, então símbolos não atrapalham.
BANCO_URL="$(printf '%s' "$BANCO_URL" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
BANCO_URL="$(python3 - "$BANCO_URL" <<'PY'
import sys, os, re
from urllib.parse import unquote
url = sys.argv[1]
m = re.match(r"^(?P<esq>[a-z]+)://(?P<usu>[^:@/]+)(?::(?P<senha>.*))?@(?P<resto>[^@]*)$", url)
if not m:
    print("diagnóstico: a URI não está no formato postgresql://usuário:senha@endereço:porta/banco", file=sys.stderr)
    sys.exit(1)
senha = unquote(m["senha"] or "")
resto = m["resto"]
separada = (os.environ.get("BANCO_SENHA") or "").strip()
print(f"diagnóstico: esquema={m['esq']} usuário={m['usu']} endereço/banco={resto.split('?')[0]}", file=sys.stderr)
print(f"diagnóstico: senha na URI tem {len(senha)} caracteres; colchetes={'[' in senha or ']' in senha}; "
      f"espaços={any(c.isspace() for c in senha)}; só letras e números={senha.isalnum()}; "
      f"parece chave sb_={senha.startswith('sb_')}; senha separada={'sim' if separada else 'não'}", file=sys.stderr)
print(f"{m['esq']}://{m['usu']}@{resto}")
if not separada:
    with open(os.path.expanduser("~/.senha_banco"), "w") as f:
        f.write(senha)
PY
)" || exit 1
if [ -n "${BANCO_SENHA:-}" ]; then
  PGPASSWORD="$(printf '%s' "$BANCO_SENHA" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
else
  PGPASSWORD="$(cat ~/.senha_banco)"; rm -f ~/.senha_banco
fi
export PGPASSWORD

PSQL=(psql "$BANCO_URL" -v ON_ERROR_STOP=1 -q -X)
tabelas="$("${PSQL[@]}" -At -c "select count(*) from pg_tables where schemaname = 'public'")" || { echo "Não conectou no banco."; exit 1; }
if [ "$tabelas" != "0" ]; then
  echo "Recusado: o esquema public já tem $tabelas tabelas. Este script só monta banco vazio."
  exit 1
fi

# Tudo vai numa transação só (montar-lote.sh): se qualquer migração falhar, nada fica gravado.
LOTE="$(mktemp)"; trap 'rm -f "$LOTE"' EXIT
MODO=psql "$RAIZ/supabase/baseline/montar-lote.sh" > "$LOTE"

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
