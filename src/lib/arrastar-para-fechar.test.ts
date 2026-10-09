import { describe, expect, it } from "vitest";

import { DISTANCIA_MINIMA_ARRASTO, gestoFechaGaveta } from "./arrastar-para-fechar";

describe("gestoFechaGaveta", () => {
  it("fecha gaveta à esquerda ao arrastar para a esquerda além do limite", () => {
    expect(gestoFechaGaveta(-DISTANCIA_MINIMA_ARRASTO, 0, "left")).toBe(true);
    expect(gestoFechaGaveta(-80, 10, "left")).toBe(true);
  });

  it("não fecha com arrasto curto ou no sentido oposto", () => {
    expect(gestoFechaGaveta(-30, 0, "left")).toBe(false);
    expect(gestoFechaGaveta(60, 0, "left")).toBe(false);
    expect(gestoFechaGaveta(0, 0, "left")).toBe(false);
  });

  it("não fecha com gesto vertical dominante", () => {
    expect(gestoFechaGaveta(-60, -80, "left")).toBe(false);
  });

  it("fecha gaveta à direita apenas arrastando para a direita", () => {
    expect(gestoFechaGaveta(60, 0, "right")).toBe(true);
    expect(gestoFechaGaveta(-60, 0, "right")).toBe(false);
  });

  it("respeita o eixo vertical em gavetas de topo e base", () => {
    expect(gestoFechaGaveta(0, -60, "top")).toBe(true);
    expect(gestoFechaGaveta(0, 60, "top")).toBe(false);
    expect(gestoFechaGaveta(0, 60, "bottom")).toBe(true);
    expect(gestoFechaGaveta(-80, 60, "bottom")).toBe(false);
  });
});
