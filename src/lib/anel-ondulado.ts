/**
 * Anel ondulado do Figaro (indicador circular "wavy"): um círculo cujo raio oscila em `ondas` ondas.
 * Com amplitude 0 é um círculo perfeito, o que permite morfar o anel ondulado no círculo do visto.
 */
export function caminhoOndulado(
  centro: number,
  raio: number,
  amplitude: number,
  ondas: number,
  passos = 180,
): string {
  const pontos: string[] = [];
  for (let i = 0; i < passos; i += 1) {
    const angulo = (i / passos) * Math.PI * 2 - Math.PI / 2;
    const r = raio + amplitude * Math.sin(ondas * (angulo + Math.PI / 2));
    const x = centro + r * Math.cos(angulo);
    const y = centro + r * Math.sin(angulo);
    pontos.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${pontos.join("")}Z`;
}
