/** Decisão pura do gesto lateral que troca o dia da Agenda. */
export const DESLOCAMENTO_MIN_X = 70;
export const DESLOCAMENTO_MAX_Y = 40;
export const BORDA_DO_SISTEMA = 24;

export type InicioDoGesto = {
  x: number;
  y: number;
  larguraTela: number;
  dentroDeRolagemLateral: boolean;
  arrastando: boolean;
};

/** O toque pode virar troca de dia? (borda do sistema, rolagem lateral e arrasto ficam de fora) */
export function gestoPodeComecar(g: InicioDoGesto) {
  if (g.arrastando || g.dentroDeRolagemLateral) return false;
  return g.x >= BORDA_DO_SISTEMA && g.x <= g.larguraTela - BORDA_DO_SISTEMA;
}

/** -1 = dia anterior, 1 = próximo dia, 0 = não troca. */
export function deveTrocarDia(f: {
  inicio: InicioDoGesto | null;
  fimX: number;
  fimY: number;
  cancelado?: boolean;
  arrastandoNoFim?: boolean;
}): -1 | 0 | 1 {
  if (!f.inicio || f.cancelado || f.arrastandoNoFim || !gestoPodeComecar(f.inicio)) return 0;
  const dx = f.fimX - f.inicio.x;
  const dy = f.fimY - f.inicio.y;
  if (Math.abs(dx) > DESLOCAMENTO_MIN_X && Math.abs(dy) < DESLOCAMENTO_MAX_Y)
    return dx < 0 ? 1 : -1;
  return 0;
}

/** Algum ancestral rola para os lados (colunas por profissional, chips)? */
export function dentroDeRolagemLateral(alvo: Element | null, limite?: Element | null) {
  for (let el = alvo; el && el !== limite; el = el.parentElement) {
    if (el.classList.contains("agenda-chips")) return true;
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}
