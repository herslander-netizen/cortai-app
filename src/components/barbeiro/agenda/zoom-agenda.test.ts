import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { limitarPx, PX_MAX, PX_MIN, PX_PADRAO, pxDaPinca } from "./zoom-agenda";

describe("zoom da timeline com dois dedos", () => {
  it("afastar os dedos aproxima as horas e juntar afasta, dentro dos limites", () => {
    expect(pxDaPinca(PX_PADRAO, 100, 200)).toBe(4);
    expect(pxDaPinca(PX_PADRAO, 200, 100)).toBe(1);
    expect(pxDaPinca(PX_PADRAO, 100, 1000)).toBe(PX_MAX);
    expect(pxDaPinca(PX_PADRAO, 1000, 100)).toBe(PX_MIN);
    expect(pxDaPinca(PX_PADRAO, 0, 100)).toBe(PX_PADRAO);
  });

  it("valor inválido volta ao padrão", () => {
    expect(limitarPx(Number.NaN)).toBe(PX_PADRAO);
    expect(limitarPx(3.14159)).toBe(3.14);
  });

  it("a timeline usa a escala compartilhada e o gesto de dia cede ao segundo dedo", () => {
    const timeline = readFileSync("src/components/barbeiro/AgendaTimeline.tsx", "utf8");
    const gesto = readFileSync("src/components/barbeiro/agenda/useGestoDia.ts", "utf8");
    expect(timeline).not.toContain("const PX_POR_MINUTO = 2.25");
    expect(timeline).toContain("const PX_POR_MINUTO = usePxPorMinuto();");
    expect(timeline).toContain("usePincaDaTimeline({");
    expect(gesto).toContain("if (e.touches.length > 1) {");
  });
});
