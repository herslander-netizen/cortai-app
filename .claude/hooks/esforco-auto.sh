#!/usr/bin/env bash
# Detecta complexidade do prompt e sugere nível de esforço via additionalContext.
# Não age se o usuário especificou esforço manualmente.
set -euo pipefail

INPUT=$(cat)
PROMPT=$(printf '%s' "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || true)

# Respeita escolha manual: /effort, --effort, "esforço baixo/alto/médio"
if printf '%s' "$PROMPT" | grep -qiE \
  '/(effort|esforco|esforço)|--effort|low effort|high effort|esforço (baixo|alto|médio|medio)|effort (low|medium|high|xhigh|max)'; then
  exit 0
fi

# Palavras-chave de tarefa PESADA (implementação, migração, auditoria, criação de módulo)
HEAVY='migrac|migrat|implement|criar (clientes|tenant|negocio|script|componente|tela|gaveta|modal|hook|funcao|funcão|página|pagina)|criar (dados|demo|ficticios|fictícios)|nova tela|novo módulo|novo componente|novo hook|nova função|nova funcao|refactor|refatorar|auditoria|audit|grande refactor|paridade|inventario|inventário|supabase/demos|drizzle/migrations|fila de espera|lista de espera|horários fictícios|agendamentos fictícios|dados de demo|modo dev|criar.*barbearia|conta.*cliente'

# Palavras-chave de tarefa SIMPLES (leitura, verificação, ajuste pontual)
LIGHT='corrigir typo|fix typo|ajustar texto|pequena correc|small fix|verificar|conferir|listar|mostrar|leitura|investigar|apenas ler|só ler|apenas mostrar|status|diario|diário|recados|em andamento|próximas tarefas|proximas tarefas|qual (é|e) o|o que (é|e)|explain|explica|como funciona'

if printf '%s' "$PROMPT" | grep -qiE "$HEAVY"; then
  MSG="[esforço auto → alto] Tarefa de implementação/criação detectada."
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}' "$MSG"
elif printf '%s' "$PROMPT" | grep -qiE "$LIGHT"; then
  MSG="[esforço auto → baixo] Tarefa de leitura/verificação detectada."
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}' "$MSG"
fi
# Se não classificou, não emite nada — deixa o padrão da sessão
