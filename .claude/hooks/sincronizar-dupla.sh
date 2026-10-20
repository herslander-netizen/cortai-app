#!/usr/bin/env bash
# Início de sessão do Claude Code: traz o que o Codex fez e mostra o diário compartilhado.
# Busca sempre a branch da migração, em qualquer branch de trabalho (as sessões na nuvem começam numa
# branch própria). Só atualiza com fast-forward e com a árvore limpa; nunca falha a sessão.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
BRANCH=cloudflare-workers-migration-2026-10-13
REMOTA="origin/$BRANCH"
ATUAL="$(git branch --show-current 2>/dev/null)"
BUSCOU=0
if timeout 30 git fetch -q origin "$BRANCH:refs/remotes/$REMOTA" >/dev/null 2>&1; then
  BUSCOU=1
else
  echo "(aviso: não consegui buscar $BRANCH; rode git pull origin $BRANCH antes de mexer)"
fi
if [ "$BUSCOU" = 1 ] && ! git merge-base --is-ancestor "$REMOTA" HEAD 2>/dev/null; then
  # A branch atual não tem os últimos commits da migração.
  if [ -z "$(git status --porcelain 2>/dev/null)" ] && git merge-base --is-ancestor HEAD "$REMOTA" 2>/dev/null; then
    git merge -q --ff-only "$REMOTA" >/dev/null 2>&1 \
      && echo "(atualizei ${ATUAL:-HEAD} com os últimos commits de $BRANCH)" \
      || echo "(aviso: não consegui atualizar ${ATUAL:-HEAD}; rode git merge $REMOTA antes de mexer)"
  else
    echo "(aviso: ${ATUAL:-HEAD} está atrás de $BRANCH e não dá para atualizar sozinho; rode git merge $REMOTA antes de mexer)"
  fi
fi
# O diário mostrado é sempre o da branch da migração (o mais novo), mesmo que a atual esteja atrás.
if [ "$BUSCOU" = 1 ] && git cat-file -e "$REMOTA:DIARIO.md" 2>/dev/null; then
  DIARIO="$(git show "$REMOTA:DIARIO.md" 2>/dev/null)"
elif [ -f DIARIO.md ]; then
  DIARIO="$(cat DIARIO.md)"
else
  exit 0
fi
echo "=== DIARIO.md (Claude + Codex): decisões, próximas tarefas, em andamento, recados e últimas entradas ==="
# Tudo até a terceira entrada do diário (as duas mais recentes), no máximo 160 linhas.
printf '%s\n' "$DIARIO" | awk '/^### [0-9]{4}-/{n++} n<3' | sed -n '/^## Decisões do dono/,$p' | head -160
echo "=== Fim do diário. Siga as Regras da dupla (topo do AGENTS.md). ==="
exit 0
