/**
 * A lista consulta períodos longos, mas renderiza somente os dias próximos
 * da posição de rolagem. Limita o trabalho síncrono ao tocar no botão Cards
 * sem remover dias, atendimentos, pesquisa ou a paginação do servidor.
 */
export const DIAS_INICIAIS = 12;
export const DIAS_POR_JANELA = 12;

export function janelaDaLista<T>(dias: readonly T[], limite: number): T[] {
  return dias.slice(0, Math.max(0, limite));
}

export function proximaJanelaDaLista(atual: number, total: number): number {
  return Math.min(total, atual + DIAS_POR_JANELA);
}
