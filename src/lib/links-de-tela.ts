/**
 * Links de tela do painel do negócio, num único lugar.
 * No banco, `public.link_de_tela(chave)` espelha esta tabela.
 */
export const LINKS_DE_TELA = {
  agenda: "/barbeiro/agenda",
  espera: "/barbeiro/fila",
  financeiro: "/barbeiro/financeiro",
  inicio: "/barbeiro",
} as const;

export function linkDoAgendamento(agendamentoId: string): string {
  return `${LINKS_DE_TELA.agenda}?agendamento=${agendamentoId}`;
}
