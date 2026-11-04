import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync("src/components/barbeiro/agenda/BotaoCircularAdicionar.tsx", "utf8");
const styles = readFileSync("src/components/barbeiro/agenda/BotaoCircularAdicionar.css", "utf8");

describe("tema do núcleo do FAB da Agenda", () => {
  it("mantém o núcleo branco somente no tema claro", () => {
    expect(styles).toContain("html.light[data-tela-agenda] .agenda-acao-fixa .agenda-fab-nucleo");
    expect(styles).toContain("background-color: #FFFFFF !important;");
  });

  it("restaura a superfície original no tema escuro com seletor mais específico que a regra global", () => {
    expect(styles).toContain("html.dark[data-tela-agenda] .agenda-acao-fixa .agenda-fab-nucleo");
    expect(styles).toContain("background-color: var(--figaro-surface-container-low, var(--painel, var(--ink3))) !important;");
    expect(component).toContain('backgroundColor: "var(--figaro-surface-container-low, var(--painel, var(--ink3)))"');
    expect(component).not.toContain('backgroundColor: "#FFFFFF"');
  });
});
