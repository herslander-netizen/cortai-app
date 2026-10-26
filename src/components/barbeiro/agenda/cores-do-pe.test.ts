import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");

describe("cores do pé da Agenda (dono, 26/10)", () => {
  it("cada botão tem uma cor só, em qualquer estado (parado, foco, hover, pressionado)", () => {
    expect(css).toContain(
      ".agenda-botao-agora-principal button:is(.agenda-botao-agora-ir, .agenda-filtro-gatilho):is(:hover, :focus, :focus-visible, :active) {\n  color: var(--paper);",
    );
    expect(css).toContain(
      ".agenda-botao-agora-principal button.agenda-botao-agora-visualizacao:is(:hover, :focus, :focus-visible, :active) {\n  color: var(--figaro-primary, var(--primary));",
    );
  });
});
