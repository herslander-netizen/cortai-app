import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { rotuloDaForma } from "@/lib/comanda-ticket";

const fonte = readFileSync(resolve(__dirname, "BuscaDeComandas.tsx"), "utf8");
const screen = readFileSync(resolve(__dirname, "../layout/Screen.tsx"), "utf8");
const financeiro = readFileSync(resolve(__dirname, "../../routes/barbeiro.financeiro.tsx"), "utf8");

describe("Financeiro no padrão Figaro (capturas do dono, 31/10)", () => {
  it("linha da comanda: valor ao lado do nome (não é empurrado para fora), estado em selo e texto que quebra", () => {
    expect(fonte).toContain("whitespace-normal");
    expect(fonte).toMatch(
      /\{c\.cliente\}<\/span>\s*<span className="shrink-0[^"]*">\s*\{brl\(c\.totalCentavos\)\}/,
    );
    expect(fonte).toContain("SELO[c.estado]");
    expect(fonte).toContain('placeholder="Buscar comanda"');
  });

  it("forma 'balcao' com acento", () => {
    expect(rotuloDaForma("balcao")).toBe("No balcão");
  });

  it("abas da área ficam abaixo do voltar e do título, antes do conteúdo", () => {
    expect(screen.indexOf("<AbasDaSecao />")).toBeGreaterThan(screen.indexOf("data-figaro-header"));
    expect(screen.indexOf("<AbasDaSecao />")).toBeLessThan(
      screen.indexOf('data-figaro-conteudo="page"'),
    );
  });

  it("sem tesoura (símbolo de segmento) no Financeiro", () => {
    expect(financeiro).not.toContain("Scissors");
  });
});
