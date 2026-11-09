/** Retorna o deslocamento de cena somente após um gesto claramente horizontal. */
export function direcaoDoDeslize(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.25) return 0;
  return dx < 0 ? 1 : -1;
}
