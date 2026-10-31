#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "::error::$1"
  exit 1
}

require_file() {
  [[ -f "$1" ]] || fail "Documento obrigatório ausente: $1"
}

require_text() {
  grep -Fq -- "$2" "$1" || fail "Referência obrigatória ausente em $1: $2"
}

for file in \
  ORIENTACOES-GERAIS-IA.md \
  AGENTS.md \
  CONTEXTO.md \
  CLAUDE.md \
  DIARIO.md \
  MUSE.md \
  PROTOCOLO-OBRIGATORIO.md \
  docs/prompt-gpt-metodo-de-trabalho.md \
  src/lib/AGENTS.md \
  src/lib/brain/AGENTS.md \
  src/lib/whatsapp/AGENTS.md \
  src/components/barbeiro/agenda/AGENTS.md \
  src/components/comanda/AGENTS.md; do
  require_file "$file"
done

require_text AGENTS.md "PROTOCOLO-OBRIGATORIO.md"
require_text AGENTS.md "ORIENTACOES-GERAIS-IA.md"
require_text CLAUDE.md "@ORIENTACOES-GERAIS-IA.md"
require_text PROTOCOLO-OBRIGATORIO.md "ORIENTACOES-GERAIS-IA.md"
require_text CONTEXTO.md "ORIENTACOES-GERAIS-IA.md"
for heading in \
  "## 1. Ordem obrigatória de leitura" \
  "## 2. Regras que nunca se quebram" \
  "## 4. Checklist de página nova" \
  "## 8. Prévia e publicação"; do
  require_text ORIENTACOES-GERAIS-IA.md "$heading"
done
require_text AGENTS.md "CONTEXTO.md"
require_text AGENTS.md "docs/prompt-gpt-metodo-de-trabalho.md"
require_text CLAUDE.md "@AGENTS.md"
require_text CLAUDE.md "@CONTEXTO.md"

for heading in \
  "## Decisões do dono" \
  "## Próximas tarefas (ordem combinada)" \
  "## Em andamento" \
  "## Recados" \
  "## Diário"; do
  require_text DIARIO.md "$heading"
done

for heading in \
  "## 0. Antes de começar" \
  "## 1. Entender antes de mexer" \
  "## 2. Banco de dados" \
  "## 3. Código, datas e interface" \
  "## 4. Antes de enviar" \
  "## 5. Quando parar e pedir autorização" \
  "## 6. Limite da verificação automática"; do
  require_text PROTOCOLO-OBRIGATORIO.md "$heading"
done

require_text PROTOCOLO-OBRIGATORIO.md "cloudflare-workers-migration-2026-10-13"
require_text PROTOCOLO-OBRIGATORIO.md "A Agenda é protegida"
require_text PROTOCOLO-OBRIGATORIO.md "supabase/baseline/ensaio/ensaio-local.sh"
require_text PROTOCOLO-OBRIGATORIO.md "bun run tsc --noEmit"
require_text PROTOCOLO-OBRIGATORIO.md "bun run vitest run"
require_text PROTOCOLO-OBRIGATORIO.md "bun run eslint"
require_text PROTOCOLO-OBRIGATORIO.md "bun run build"

echo "OK: documentos, referências e pontos obrigatórios do protocolo Flow conferidos."
