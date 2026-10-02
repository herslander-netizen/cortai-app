import { useSyncExternalStore } from "react";

export type LadoDoAgora = "visivel" | "acima" | "abaixo";

/**
 * Decide onde está a linha do agora em relação à área livre
 * (entre o que gruda no topo e a faixa de baixo).
 * Na borda conta como visível — evita piscar.
 */
export function ladoDoAgora(linha: { top: number; bottom: number }, area: { top: number; bottom: number }): LadoDoAgora {
  if (linha.bottom < area.top) return "acima";
  if (linha.top > area.bottom) return "abaixo";
  return "visivel";
}

/** Rolagem que leva a linha ao meio da área livre. */
export function deslocamentoAteOMeio(linhaTop: number, area: { top: number; bottom: number }) {
  return linhaTop - (area.top + area.bottom) / 2;
}

// Ponte entre a Timeline (dentro do deslize de dia) e a faixa de baixo (fora dele).
type Estado = { lado: LadoDoAgora | null; ir: (() => void) | null };
let estado: Estado = { lado: null, ir: null };
const ouvintes = new Set<() => void>();

export function publicarAgora(proximo: Estado) {
  if (proximo.lado === estado.lado && proximo.ir === estado.ir) return;
  estado = proximo;
  ouvintes.forEach((f) => f());
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

const vazio: Estado = { lado: null, ir: null };
export function usePilulaAgora() {
  return useSyncExternalStore(assinar, () => estado, () => vazio);
}
