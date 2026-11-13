/**
 * Origem da mensagem enviada pelo Flow:
 * - porIa: texto gerado pela Flow IA;
 * - autorUserId: ação humana autenticada no painel;
 * - sem IA e sem ator humano: Flow Bot ou automação determinística.
 *
 * Não confundir "não foi IA" com "foi uma pessoa".
 * Uma resposta da equipe recebida da Evolution (fromMe) é registrada
 * por humano.server.ts, em fluxo separado.
 */
export function classificarAutoriaDaSaida(input: {
  porIa: boolean;
  autorUserId?: string | null;
}): { gerada_por_ia: boolean; gerada_por_humano: boolean } {
  return {
    gerada_por_ia: input.porIa,
    gerada_por_humano:
      !input.porIa && typeof input.autorUserId === "string" && input.autorUserId.trim().length > 0,
  };
}

/** Automação só é autorizada por confirmação explícita da RPC de plano. */
export function recursoWhatsappConfirmado(data: unknown, error: unknown): boolean {
  return error == null && data === true;
}
