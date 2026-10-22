import { describe, expect, it } from "vitest";

import { caminhoOndulado } from "./anel-ondulado";

function pontosDo(caminho: string) {
  return [...caminho.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as const,
  );
}

describe("caminhoOndulado", () => {
  it("fecha o caminho e gera um ponto por passo", () => {
    const d = caminhoOndulado(50, 40, 3, 10, 48);
    expect(d.endsWith("Z")).toBe(true);
    expect(pontosDo(d)).toHaveLength(48);
  });

  it("sem amplitude é um círculo perfeito", () => {
    for (const [x, y] of pontosDo(caminhoOndulado(50, 40, 0, 10))) {
      expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(40, 1);
    }
  });

  it("com amplitude o raio oscila entre raio ± amplitude", () => {
    const raios = pontosDo(caminhoOndulado(50, 40, 3, 10, 360)).map(([x, y]) =>
      Math.hypot(x - 50, y - 50),
    );
    expect(Math.max(...raios)).toBeCloseTo(43, 0);
    expect(Math.min(...raios)).toBeCloseTo(37, 0);
  });
});
