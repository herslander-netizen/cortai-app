/** Distância mínima horizontal (px) para o arrasto contar como fechamento. */
export const DISTANCIA_MINIMA_ARRASTO = 48;

export type LadoDaGaveta = "left" | "right" | "top" | "bottom";

/**
 * Decide se o deslocamento do toque fecha a gaveta.
 * Só conta movimento no sentido de recolher a gaveta (esquerda fecha para a
 * esquerda, direita para a direita etc.), com dominância horizontal/vertical
 * conforme o lado — gesto no eixo errado ou sentido oposto nunca fecha.
 */
export function gestoFechaGaveta(dx: number, dy: number, lado: LadoDaGaveta): boolean {
  if (lado === "left" || lado === "right") {
    if (Math.abs(dy) > Math.abs(dx)) return false;
    return lado === "left" ? dx <= -DISTANCIA_MINIMA_ARRASTO : dx >= DISTANCIA_MINIMA_ARRASTO;
  }
  if (Math.abs(dx) > Math.abs(dy)) return false;
  return lado === "top" ? dy <= -DISTANCIA_MINIMA_ARRASTO : dy >= DISTANCIA_MINIMA_ARRASTO;
}
