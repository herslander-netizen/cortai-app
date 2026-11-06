/**
 * Organização da lista da Agenda por horário (pedido do dono para a Agenda, 06/11/2026: "organizar visualmente com
 * separadores… discreto, minimalista, organizado"). Regras puras: a tela só desenha.
 */

export type GrupoDeHorario<T> = { hora: string; inicio: string; itens: T[] };

/**
 * Junta atendimentos seguidos que começam no mesmo horário ("09:00 · 3 atendimentos"). Espera a lista já em ordem
 * de horário (como sai de `agruparPorDia`).
 */
export function agruparPorHorario<T extends { inicio: string }>(
  itens: readonly T[],
  horaDe: (inicio: string) => string,
): GrupoDeHorario<T>[] {
  const grupos: GrupoDeHorario<T>[] = [];
  for (const item of itens) {
    const hora = horaDe(item.inicio);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.hora === hora) ultimo.itens.push(item);
    else grupos.push({ hora, inicio: item.inicio, itens: [item] });
  }
  return grupos;
}

/**
 * Onde entra o marcador "agora" na lista de hoje: antes do primeiro horário que ainda não começou. Devolve
 * `grupos.length` quando tudo já começou (marcador no fim) e 0 quando nada começou (no topo).
 */
export function posicaoDoAgora(grupos: readonly { inicio: string }[], agora: Date): number {
  const limite = agora.getTime();
  const i = grupos.findIndex((g) => Date.parse(g.inicio) > limite);
  return i === -1 ? grupos.length : i;
}

/**
 * Texto discreto da coluna de horário (52 px): duração quando é um só; quantidade abreviada quando são vários — "3
 * atendimentos" não cabia e invadia o trilho.
 */
export function legendaDoHorario(itens: readonly { duracaoMin: number }[]): string {
  if (itens.length === 1) return `${itens[0]!.duracaoMin} min`;
  return `${itens.length} atend.`;
}
