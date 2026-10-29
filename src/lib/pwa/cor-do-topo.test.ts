import { describe, expect, it } from "vitest";

import { hex, misturar } from "./cor-do-topo";

describe("cor da barra do sistema", () => {
  it("mistura uma cor translúcida sobre o fundo da página", () => {
    const topo = { r: 43, g: 48, b: 46, a: 0.94 };
    const pagina = { r: 29, g: 32, b: 31, a: 1 };
    expect(hex(misturar(topo, pagina))).toBe("#2a2f2d");
  });

  it("cor opaca fica como está", () => {
    expect(hex(misturar({ r: 255, g: 0, b: 16, a: 1 }, { r: 0, g: 0, b: 0, a: 1 }))).toBe(
      "#ff0010",
    );
  });
});

describe("barra do sistema acompanha a transição do topo (vídeo do dono, 29/10)", () => {
  it("a cada sinal de mudança, atualiza quadro a quadro em vez de conferir a cada 300 ms", async () => {
    const { readFileSync } = await import("node:fs");
    const fonte = readFileSync("src/lib/pwa/cor-do-topo.ts", "utf8");
    expect(fonte).toContain("new MutationObserver(acordar)");
    expect(fonte).toContain("window.requestAnimationFrame(acompanhar)");
    expect(fonte).toContain('document.addEventListener("transitionstart", acordar, true)');
    expect(fonte).not.toContain("setInterval(atualizar, 300)");
  });
});
