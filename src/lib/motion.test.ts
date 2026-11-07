import { describe, expect, it } from "vitest";

import {
  ESCALA_TOQUE,
  molaPrecisao,
  molaRapida,
  molaBase,
  molaLenta,
  molaEfeito,
} from "./motion";

describe("tokens de movimento", () => {
  it("define a escala tátil de 2% sem alterar o tamanho base", () => {
    expect(ESCALA_TOQUE).toBe(0.98);
  });

  it("usa amortecimento crítico na mola de precisão", () => {
    const razaoAmortecimento =
      molaPrecisao.damping /
      (2 * Math.sqrt(molaPrecisao.stiffness * molaPrecisao.mass));

    expect(molaPrecisao.stiffness).toBe(400);
    expect(molaPrecisao.mass).toBe(1);
    expect(razaoAmortecimento).toBe(1);
  });

  it("preserva os parâmetros das molas existentes", () => {
    expect(molaRapida).toMatchObject({
      type: "spring",
      stiffness: 1400,
      damping: 67.3,
      mass: 1,
    });
    expect(molaBase).toMatchObject({
      type: "spring",
      stiffness: 700,
      damping: 47.6,
      mass: 1,
    });
    expect(molaLenta).toMatchObject({
      type: "spring",
      stiffness: 300,
      damping: 31.2,
      mass: 1,
    });
    expect(molaEfeito).toMatchObject({
      type: "spring",
      stiffness: 1600,
      damping: 80,
      mass: 1,
    });
  });
});
