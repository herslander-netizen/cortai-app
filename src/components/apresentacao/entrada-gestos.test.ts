import { describe, expect, it } from "vitest";

import { direcaoDoDeslize } from "./entrada-gestos";

describe("gestos da apresentação Flow", () => {
  it("avança ao deslizar claramente para a esquerda", () => {
    expect(direcaoDoDeslize(-80, 10)).toBe(1);
  });

  it("volta ao deslizar claramente para a direita", () => {
    expect(direcaoDoDeslize(80, -10)).toBe(-1);
  });

  it("não troca cena com toque curto", () => {
    expect(direcaoDoDeslize(25, 0)).toBe(0);
  });

  it("preserva a rolagem vertical e evita gestos diagonais", () => {
    expect(direcaoDoDeslize(45, 110)).toBe(0);
    expect(direcaoDoDeslize(-55, 50)).toBe(0);
  });
});
