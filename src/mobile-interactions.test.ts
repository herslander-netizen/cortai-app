import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/mobile-interactions.css", "utf8");
const root = readFileSync("src/routes/__root.tsx", "utf8");

describe("polimento de interação mobile fora da Agenda", () => {
  it("escopa os estilos para fora da Agenda protegida", () => {
    expect(css).toContain('html:not([data-tela-agenda])');
    expect(root).toContain('d.dataset.telaAgenda=""');
    expect(root).toContain('delete d.dataset.telaAgenda');
  });

  it("remove realce, seleção e zoom de duplo toque apenas dos controles", () => {
    expect(css).toContain("-webkit-tap-highlight-color: transparent");
    expect(css).toContain("touch-action: manipulation");
    expect(css).toContain("[role=\"button\"]");
    expect(css).not.toMatch(/html:not\(\[data-tela-agenda\]\)\s*body\s*\{[^}]*touch-action:\s*none/s);
  });

  it("preserva campos editáveis e texto marcado para cópia", () => {
    expect(css).toContain('[contenteditable="true"]');
    expect(css).toContain('[data-selectable="true"]');
    expect(css).toContain("user-select: text");
    expect(css).toContain("touch-action: auto");
  });

  it("não desativa o zoom por pinça nem altera a viewport global", () => {
    expect(css).toContain("Não desativar o zoom por pinça");
    expect(css).not.toMatch(/touch-action:\s*none/);
    expect(root).toContain("width=device-width, initial-scale=1, viewport-fit=cover");
    expect(root).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
  });
});
