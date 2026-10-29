import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fastOutSlowInProgresso, limitarPx, PX_MAX, PX_MIN, PX_PADRAO, pxDaEdicao, pxDaPinca } from "./zoom-agenda";

describe("zoom da timeline com dois dedos", () => {
  it("afastar os dedos aproxima as horas e juntar afasta, dentro dos limites", () => {
    expect(pxDaPinca(PX_PADRAO, 100, 200)).toBe(4);
    expect(pxDaPinca(PX_PADRAO, 200, 100)).toBe(1);
    expect(pxDaPinca(PX_PADRAO, 100, 1000)).toBe(PX_MAX);
    expect(pxDaPinca(PX_PADRAO, 1000, 100)).toBe(PX_MIN);
    expect(pxDaPinca(PX_PADRAO, 0, 100)).toBe(PX_PADRAO);
  });

  it("usa a curva FastOutSlowIn para o zoom de entrada e saída", () => {
    expect(fastOutSlowInProgresso(0)).toBe(0);
    expect(fastOutSlowInProgresso(1)).toBe(1);
    expect(fastOutSlowInProgresso(0.25)).toBeLessThan(fastOutSlowInProgresso(0.5));
    expect(fastOutSlowInProgresso(0.5)).toBeLessThan(fastOutSlowInProgresso(0.75));
    expect(fastOutSlowInProgresso(0.5)).toBeGreaterThan(0.7);
    expect(fastOutSlowInProgresso(0.5)).toBeLessThan(0.9);
  });

  it("valor inválido volta ao padrão", () => {
    expect(limitarPx(Number.NaN)).toBe(PX_PADRAO);
    expect(limitarPx(3.14159)).toBe(3.14);
  });

  it("a timeline usa a escala compartilhada e o gesto de dia cede ao segundo dedo", () => {
    const timeline = readFileSync("src/components/barbeiro/AgendaTimeline.tsx", "utf8");
    const gesto = readFileSync("src/components/barbeiro/agenda/useGestoDia.ts", "utf8");
    expect(timeline).not.toContain("const PX_POR_MINUTO = 2.25");
    expect(timeline).toContain("const PX_POR_MINUTO = usePxPorMinuto(!previa);");
    expect(timeline).toContain("usePincaDaTimeline({");
    expect(gesto).toContain("if (e.touches.length > 1) {");
  });

  it("centraliza o cartão no espaço visível ao sair do zoom armado", () => {
    const zoom = readFileSync("src/components/barbeiro/agenda/zoom-agenda.ts", "utf8");
    expect(zoom).toContain("minutoDoCentro");
    expect(zoom).toContain("alturaVisivel * 0.34");
    expect(zoom).toContain("restaurar");
  });

  it("na edição as horas aproximam para 4 px/min (sem diminuir um zoom maior)", () => {
    expect(pxDaEdicao(2)).toBe(4);
    expect(pxDaEdicao(PX_MAX)).toBe(PX_MAX);
    const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");
    const timeline = readFileSync("src/components/barbeiro/AgendaTimeline.tsx", "utf8");
    expect(operacional).toContain("useZoomDaEdicao(edicao.rascunho?.id ?? null, ancoraZoomEdicao);");
    expect(timeline).toContain("if (!g.ativo) onEditar?.(item, ySolto ?? g.y0);");
    expect(timeline).toContain("onAtualizarYDoToque?.(g.id, e.clientY);");
    expect(timeline).toContain("aoCorrigirRolagemDoZoom");
  });
});
