/** Constantes e arredondamento da régua contextual da Timeline mobile. */
export const PX_POR_MINUTO_PRECISAO = 4;
export const CABECALHO_ZOOM_PX = 30;

/** Converte o movimento da régua em passos discretos de cinco minutos. */
export function deltaPrecisaoPorArrasto(dy: number): number {
  return Math.round(dy / (PX_POR_MINUTO_PRECISAO * 5)) * 5;
}
