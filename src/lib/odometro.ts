/**
 * Sentido de cada dígito ao trocar, como `FigarooOdometerKt`: 1 quando o dígito novo é maior (entra
 * de baixo), -1 quando é menor (entra de cima), 0 quando não muda ou não é dígito.
 * As colunas são alinhadas pela direita, para "9" → "10" acrescentar uma coluna à esquerda.
 */
export function sentidosDoOdometro(anterior: string, atual: string): number[] {
  return [...atual].map((c, i) => {
    const antes = anterior[anterior.length - atual.length + i];
    if (antes === undefined || antes === c) return 0;
    const novo = Number.parseInt(c, 10);
    const velho = Number.parseInt(antes, 10);
    if (Number.isNaN(novo)) return 0;
    return novo > (Number.isNaN(velho) ? 0 : velho) ? 1 : -1;
  });
}
