import { humanoNoControle } from "@/lib/flow-bot/decisao";

/**
 * A contingência só pode responder após confirmar que a conversa está livre.
 * Bot e IA já consultam posse humana, mas ambos podem falhar/retornar false:
 * isso NÃO autoriza a mensagem de fallback a falar por cima do profissional.
 */
export function bloquearContingenciaPorPosse(input: {
  conversa: { status?: unknown; modo_humano?: unknown; modo_humano_ate?: unknown } | null;
  erro: unknown;
  agora: number;
}): boolean {
  // Consulta com erro/sem linha: estado desconhecido, não presumir liberação.
  if (input.erro != null || !input.conversa) return true;
  return humanoNoControle(input.conversa, input.agora);
}
