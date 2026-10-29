/**
 * Rolagem automática na borda durante o arrasto (Figaroo AgendaEdgeAutoScroll).
 * A velocidade cresce linearmente ao se aproximar da borda e é limitada por quadro.
 */
export const FAIXA_DA_BORDA_PX = 48;
export const VELOCIDADE_MAXIMA_ROLAGEM_PX_SEG = 720;
export const QUADRO_MAXIMO_ROLAGEM_MS = 33;

export function velocidadeDeRolagemNaBorda(
  dedoY: number,
  topo: number,
  base: number,
  faixa = FAIXA_DA_BORDA_PX,
  velocidadeMaxima = VELOCIDADE_MAXIMA_ROLAGEM_PX_SEG,
) {
  const zona = Math.max(1, faixa);
  if (dedoY < topo + zona) {
    const progresso = Math.min(1, Math.max(0, (topo + zona - dedoY) / zona));
    return -velocidadeMaxima * progresso;
  }
  if (dedoY > base - zona) {
    const progresso = Math.min(1, Math.max(0, (dedoY - (base - zona)) / zona));
    return velocidadeMaxima * progresso;
  }
  return 0;
}

/** Deslocamento em pixels por quadro; limita pausas longas para evitar saltos. */
export function deslocamentoDeRolagem(velocidadePxPorSegundo: number, deltaMs: number) {
  const tempo = Math.min(QUADRO_MAXIMO_ROLAGEM_MS, Math.max(0, deltaMs));
  return (velocidadePxPorSegundo * tempo) / 1000;
}
