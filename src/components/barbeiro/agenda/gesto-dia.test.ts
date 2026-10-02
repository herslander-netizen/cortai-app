import { describe, expect, it } from "vitest";

import { deveTrocarDia, type InicioDoGesto } from "./gesto-dia";

const base: InicioDoGesto = {
  x: 200,
  y: 300,
  larguraTela: 390,
  dentroDeRolagemLateral: false,
  arrastando: false,
};

describe("deveTrocarDia", () => {
  it("mantém 70 px na horizontal e menos de 40 px na vertical", () => {
    expect(deveTrocarDia({ inicio: base, fimX: 120, fimY: 310 })).toBe(1);
    expect(deveTrocarDia({ inicio: base, fimX: 280, fimY: 310 })).toBe(-1);
    expect(deveTrocarDia({ inicio: base, fimX: 140, fimY: 300 })).toBe(0);
    expect(deveTrocarDia({ inicio: base, fimX: 100, fimY: 345 })).toBe(0);
  });
  it("ignora toque que começa na borda do sistema", () => {
    expect(deveTrocarDia({ inicio: { ...base, x: 10 }, fimX: 200, fimY: 300 })).toBe(0);
    expect(deveTrocarDia({ inicio: { ...base, x: 380 }, fimX: 200, fimY: 300 })).toBe(0);
    expect(deveTrocarDia({ inicio: { ...base, x: 24 }, fimX: 120, fimY: 300 })).toBe(-1);
  });
  it("ignora toque dentro de área que rola para os lados", () => {
    expect(
      deveTrocarDia({ inicio: { ...base, dentroDeRolagemLateral: true }, fimX: 100, fimY: 300 }),
    ).toBe(0);
  });
  it("ignora touchcancel e arrasto de atendimento", () => {
    expect(deveTrocarDia({ inicio: base, fimX: 100, fimY: 300, cancelado: true })).toBe(0);
    expect(deveTrocarDia({ inicio: { ...base, arrastando: true }, fimX: 100, fimY: 300 })).toBe(0);
    expect(deveTrocarDia({ inicio: base, fimX: 100, fimY: 300, arrastandoNoFim: true })).toBe(0);
    expect(deveTrocarDia({ inicio: null, fimX: 100, fimY: 300 })).toBe(0);
  });
});
