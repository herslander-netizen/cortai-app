import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const agenda = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");
const handler = agenda.slice(agenda.indexOf("  function alterarVisualizacao("), agenda.indexOf("  function alternarModoDiscreto("));

describe("Agenda mobile: toque não aguarda rolagem", () => {
  it("solicita o novo painel antes de rolar ao topo", () => {
    expect(handler.indexOf("setVisualizacao(segura)")).toBeGreaterThan(0);
    expect(handler.indexOf("window.requestAnimationFrame(")).toBeGreaterThan(handler.indexOf("setVisualizacao(segura)"));
    expect(handler.indexOf("window.scrollTo(")).toBeGreaterThan(handler.indexOf("window.requestAnimationFrame("));
    expect(handler).toContain("salvarPreferenciaAgenda(segura)");
    expect(handler).toContain('if (celular && segura === "lista" && visualizacao !== "lista")');
    expect(handler).toContain('window.scrollTo({ top: 0, behavior: "auto" })');
    expect(handler).not.toContain('if (celular && segura === "lista" && visualizacao !== "lista") window.scrollTo');
  });

  it("cancela rolagem antiga em toques rápidos e ao desmontar", () => {
    expect(handler).toContain("window.cancelAnimationFrame(rolagemDaTroca.current)");
    expect(agenda).toContain("if (rolagemDaTroca.current !== null) window.cancelAnimationFrame(rolagemDaTroca.current)");
  });
});
