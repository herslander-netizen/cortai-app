import { describe, expect, it } from "vitest";

import { alfaDoTituloPequeno, DISTANCIA_DO_TITULO } from "./useTituloRecolhivel";

describe("título recolhível do Figaro", () => {
  it("o título pequeno começa invisível, termina inteiro e só aparece no fim do recolhimento", () => {
    expect(alfaDoTituloPequeno(0)).toBeCloseTo(0, 3);
    expect(alfaDoTituloPequeno(1)).toBeCloseTo(1, 3);
    expect(alfaDoTituloPequeno(0.5)).toBeLessThan(0.15);
    expect(alfaDoTituloPequeno(0.9)).toBeGreaterThan(0.5);
    expect(alfaDoTituloPequeno(-1)).toBe(alfaDoTituloPequeno(0));
    expect(alfaDoTituloPequeno(2)).toBe(alfaDoTituloPequeno(1));
  });

  it("recolhe na altura da linha do título mais o espaço até o subtítulo", () => {
    expect(DISTANCIA_DO_TITULO).toBe(42 + 16);
  });
});
