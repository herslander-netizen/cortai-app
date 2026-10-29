/**
 * Papel que o cérebro Flow IA usa para quem fala pelo PAINEL.
 * Barbeiro (profissional) enxerga só a própria agenda e nenhum indicador do negócio;
 * dono, gerente e recepção operam o negócio inteiro, limitados pelas permissões de cada um.
 * (No WhatsApp a regra é outra e mais restrita: ver `whatsapp/identidade.server.ts`.)
 */
export type PapelDoPainel = "profissional" | "dono";

export function papelDoPainel(papelNaEquipe: string | null | undefined): PapelDoPainel {
  const p = (papelNaEquipe ?? "").toLowerCase();
  return p === "barbeiro" || p === "profissional" ? "profissional" : "dono";
}
