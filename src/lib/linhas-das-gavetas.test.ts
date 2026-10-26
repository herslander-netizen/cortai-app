import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");
const layout = readFileSync("src/routes/barbeiro.tsx", "utf8");

describe("linhas das gavetas (dono, 26/10)", () => {
  it("fora da Agenda as divisórias viram traço neutro, só sem alto contraste", () => {
    expect(css).toContain("@media not (prefers-contrast: more) {");
    expect(css).toContain('html:not([data-tela-agenda]) .mov-sheet:not([class*="agenda-"]) {');
  });

  it("Agenda protegida: a tela da Agenda marca a página para ficar de fora", () => {
    expect(layout).toContain('raiz.dataset["telaAgenda"] = ""');
    expect(layout).toContain("const naAgenda = /^\\/barbeiro(\\/agenda)?\\/?$/.test(caminho);");
  });
});
