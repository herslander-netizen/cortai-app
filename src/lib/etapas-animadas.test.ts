import { describe, expect, it } from "vitest";

import { sentidoDaEtapa, variantesDaEtapa } from "./etapas-animadas";

describe("etapas animadas (Figaro, 220 ms)", () => {
  it("avançar entra pela direita e voltar pela esquerda", () => {
    expect(sentidoDaEtapa(0, 1)).toBe(1);
    expect(sentidoDaEtapa(3, 2)).toBe(-1);
    const avancar = { sentido: 1, menosMovimento: false } as const;
    expect(variantesDaEtapa.entra(avancar)).toEqual({ opacity: 0, x: "100%" });
    expect(variantesDaEtapa.sai(avancar)).toMatchObject({ opacity: 0, x: "-100%" });
    const voltar = { sentido: -1, menosMovimento: false } as const;
    expect(variantesDaEtapa.entra(voltar)).toEqual({ opacity: 0, x: "-100%" });
    expect(variantesDaEtapa.sai(voltar)).toMatchObject({ x: "100%" });
  });

  it("dura 220 ms com a curva do Figaro", () => {
    const fica = variantesDaEtapa.fica({ sentido: 1, menosMovimento: false });
    expect(fica.transition).toMatchObject({ duration: 0.22, ease: [0.4, 0, 0.2, 1] });
  });

  it("com menos movimento só esmaece, em 150 ms", () => {
    const c = { sentido: 1, menosMovimento: true } as const;
    expect(variantesDaEtapa.entra(c)).toEqual({ opacity: 0 });
    expect(variantesDaEtapa.sai(c)).not.toHaveProperty("x");
    expect(variantesDaEtapa.fica(c).transition.duration).toBe(0.15);
  });
});
