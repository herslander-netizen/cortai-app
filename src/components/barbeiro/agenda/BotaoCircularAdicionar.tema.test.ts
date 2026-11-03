import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  "src/components/barbeiro/agenda/BotaoCircularAdicionar.tsx",
  "utf8",
);
const styles = readFileSync(
  "src/components/barbeiro/agenda/BotaoCircularAdicionar.css",
  "utf8",
);

describe("tema do núcleo do FAB da Agenda", () => {
  it("mantém o branco somente no tema claro", () => {
    expect(styles).toContain(":root.light[data-tela-agenda] .agenda-fab-nucleo");
    expect(styles).toContain("background-color: #FFFFFF !important;");
  });

  it("preserva o token original de superfície no tema escuro", () => {
    expect(styles).toContain(":root:not(.light)[data-tela-agenda] .agenda-fab-nucleo");
    expect(styles).toContain(
      "background-color: var(--figaro-surface-container-low, var(--painel, var(--ink3))) !important;",
    );
    expect(component).toContain(
      'backgroundColor: "var(--figaro-surface-container-low, var(--painel, var(--ink3)))"',
    );
    expect(component).not.toContain('backgroundColor: "#FFFFFF"');
  });
});
