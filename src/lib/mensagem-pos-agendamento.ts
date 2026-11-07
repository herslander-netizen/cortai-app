/** Mensagem do negócio depois de agendar (dono, 07/11/2026; coluna `tenants.mensagem_pos_agendamento`, migração 0061). */
export const LIMITE_DA_MENSAGEM_POS = 300;

/** Texto limpo: espaços e linhas em branco organizados, sem passar do limite; vazio vira null. */
export function limparMensagemPos(texto: string | null | undefined): string | null {
  const t = (texto ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, LIMITE_DA_MENSAGEM_POS)
    .trim();
  return t || null;
}
