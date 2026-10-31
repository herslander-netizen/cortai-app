#!/usr/bin/env bash
# Copia o motor do Flow Bot (contratos + runtime, sem servidor nem banco) e o modelo de atendimento do Flow para
# src/lib/flow-bot/. O motor é mantido no repositório herslander-netizen/flow-bot; aqui ele é só uma cópia presa a
# uma versão (VERSAO). Não edite os arquivos copiados: altere no flow-bot, teste lá e rode este script de novo.
# Uso: scripts/sincronizar-flow-bot.sh [caminho do flow-bot]   (padrão: ../flow-bot)
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ORIGEM="$(cd "${1:-$RAIZ/../flow-bot}" && pwd)"
[ -f "$ORIGEM/packages/runtime/src/motor.ts" ] || { echo "Não achei o flow-bot em $ORIGEM"; exit 1; }
VERSAO="$(git -C "$ORIGEM" rev-parse --short HEAD)"
[ -z "$(git -C "$ORIGEM" status --porcelain packages presets)" ] || { echo "O flow-bot tem mudanças sem commit; faça commit antes."; exit 1; }
DESTINO="$RAIZ/src/lib/flow-bot/nucleo"
rm -rf "$DESTINO/contratos" "$DESTINO/motor"
mkdir -p "$DESTINO/contratos" "$DESTINO/motor" "$RAIZ/src/lib/flow-bot/modelos"
CAB="// Copiado de flow-bot@$VERSAO por scripts/sincronizar-flow-bot.sh. Não edite aqui: altere no flow-bot e sincronize."
copiar() {
  # zod 3.25 do Flow traz a API nova em "zod/v4"; imports relativos sem ".js"; o pacote de contratos vira pasta irmã.
  { echo "$CAB"; sed -E \
      -e 's#from "zod"#from "zod/v4"#' \
      -e 's#from "@flow-bot/contracts"#from "../contratos"#' \
      -e 's#from "(\.\.?/[^"]+)\.js"#from "\1"#' \
      "$1"; } > "$2"
}
# Contratos: tudo menos o gerador de JSON Schema (só usado no flow-bot).
for f in catalog flow realidade regex-segura validate variables; do
  copiar "$ORIGEM/packages/contracts/src/$f.ts" "$DESTINO/contratos/$f.ts"
done
copiar "$ORIGEM/packages/contracts/src/index.ts" "$DESTINO/contratos/index.ts"
sed -i '/json-schema/d' "$DESTINO/contratos/index.ts"
for f in correspondencia index motor normalizar plano sessao simulador sorteio variaveis; do
  copiar "$ORIGEM/packages/runtime/src/$f.ts" "$DESTINO/motor/$f.ts"
done
for f in perfil atendimento atendimento.cenarios; do
  cp "$ORIGEM/presets/flow/$f.json" "$RAIZ/src/lib/flow-bot/modelos/$f.json"
done
echo "$VERSAO" > "$DESTINO/VERSAO"
printf '%s\n%s\n' "$CAB" "export const VERSAO_DO_NUCLEO = \"$VERSAO\";" > "$DESTINO/versao.ts"
echo "Flow Bot sincronizado: flow-bot@$VERSAO"
