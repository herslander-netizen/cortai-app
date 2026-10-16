#!/usr/bin/env bash
# Início de sessão do Claude Code: traz o que o Codex fez e mostra o diário compartilhado.
# Só atualiza com fast-forward, na branch da migração e com a árvore limpa; nunca falha a sessão.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
BRANCH=cloudflare-workers-migration-2026-10-13
if [ "$(git branch --show-current 2>/dev/null)" = "$BRANCH" ] && [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  timeout 30 git pull -q --ff-only origin "$BRANCH" >/dev/null 2>&1 || echo "(aviso: não consegui atualizar $BRANCH; rode git pull antes de mexer)"
fi
[ -f DIARIO.md ] || exit 0
echo "=== DIARIO.md (Claude + Codex): decisões, próximas tarefas, em andamento, recados e últimas entradas ==="
# Tudo até a terceira entrada do diário (as duas mais recentes), no máximo 160 linhas.
awk '/^### [0-9]{4}-/{n++} n<3' DIARIO.md | sed -n '/^## Decisões do dono/,$p' | head -160
echo "=== Fim do diário. Siga as Regras da dupla (topo do AGENTS.md). ==="
exit 0
