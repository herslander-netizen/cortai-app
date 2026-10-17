import { describe, expect, it } from "vitest";

import { deltaPrecisaoPorArrasto, PX_POR_MINUTO_PRECISAO } from "./zoom-precisao";

describe("lupa de precisão da Agenda", () => {
  it("usa uma escala de vinte pixels por passo de cinco minutos", () => {
    expect(PX_POR_MINUTO_PRECISAO * 5).toBe(20);
    expect(deltaPrecisaoPorArrasto(20)).toBe(5);
    expect(deltaPrecisaoPorArrasto(40)).toBe(10);
  });

  it("arredonda os dois sentidos para passos de cinco minutos", () => {
    expect(deltaPrecisaoPorArrasto(9)).toBe(0);
    expect(deltaPrecisaoPorArrasto(11)).toBe(5);
    expect(deltaPrecisaoPorArrasto(-11)).toBe(-5);
    expect(deltaPrecisaoPorArrasto(-20)).toBe(-5);
  });

  it("não muda o horário quando o gesto não percorre distância suficiente", () => {
    expect(deltaPrecisaoPorArrasto(0)).toBe(0);
    expect(deltaPrecisaoPorArrasto(8)).toBe(0);
    expect(deltaPrecisaoPorArrasto(-8)).toBe(0);
  });
});
