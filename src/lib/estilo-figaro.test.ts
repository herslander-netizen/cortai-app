import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** Todos os .tsx de src (sem testes), para varrer o texto-fonte. */
function arquivos(pasta: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, saida);
    else if (caminho.endsWith(".tsx") && !caminho.endsWith(".test.tsx")) saida.push(caminho);
  }
  return saida;
}

const FONTES = arquivos("src").map((caminho) => ({ caminho, texto: readFileSync(caminho, "utf8") }));

/** Decisão do dono (24/10/2026): toda tela segue o padrão Figaro. Estes testes seguram os primitivos. */
describe("padrão Figaro nos primitivos", () => {
  it("o Chip único é o seletor de escolha: sem chip local nem a classe antiga", () => {
    const locais = FONTES.filter(
      (f) => !f.caminho.endsWith("ui/chip.tsx") && /function Chip\(/.test(f.texto),
    ).map((f) => f.caminho);
    expect(locais).toEqual([]);
    const antigos = FONTES.filter((f) => f.texto.includes("agenda-chip ")).map((f) => f.caminho);
    expect(antigos).toEqual([]);
    const chip = readFileSync("src/components/ui/chip.tsx", "utf8");
    expect(chip).toContain("h-9");
    expect(chip).toContain("rounded-lg");
  });

  it("botão fantasma não vira caixa com contorno ad hoc", () => {
    const fora = FONTES.filter((f) =>
      /variant="ghost"[^>]{0,300}rounded-md border border-line/.test(f.texto),
    ).map((f) => f.caminho);
    expect(fora).toEqual([]);
  });

  it("erro e aviso dentro da tela usam Aviso, não texto com faixa lateral", () => {
    // A faixa de status do item da lista da Agenda é marcador de estado (Figaro), não aviso.
    const fora = FONTES.filter(
      (f) =>
        !f.caminho.endsWith("agenda/ListaAgenda.tsx") &&
        /border-l-2 border-(brick|gold)[^"]*pl-\d/.test(f.texto),
    ).map((f) => f.caminho);
    expect(fora).toEqual([]);
  });

  it("todo <select> usa field-control (campo preenchido do Figaro)", () => {
    const fora: string[] = [];
    for (const f of FONTES) {
      for (const m of f.texto.matchAll(/<select\b/g)) {
        const trecho = f.texto.slice(m.index, m.index + 700).split("</select>")[0] ?? "";
        if (!trecho.includes("field-control") && !trecho.includes("className={input}")) fora.push(f.caminho);
      }
    }
    expect(fora).toEqual([]);
  });

  it("diálogos, cartões e selos seguem os raios do Figaro", () => {
    const le = (p: string) => readFileSync(p, "utf8");
    expect(le("src/components/ui/dialog.tsx")).toContain("rounded-[28px]");
    expect(le("src/components/ui/alert-dialog.tsx")).toContain("rounded-[28px]");
    expect(le("src/components/ui/card.tsx")).toContain("rounded-[12px]");
    expect(le("src/components/ui/badge.tsx")).toContain("rounded-full");
    const css = le("src/styles.css");
    expect(css).toMatch(/@utility surface \{\s*border: 0;\s*border-radius: 12px;/);
  });
});

describe("ordem permanente", () => {
  it("o documento existe e está ligado nos arquivos de regra", () => {
    const ordem = readFileSync("docs/ordem-padrao-figaro.md", "utf8");
    expect(ordem).toContain("ORDEM PERMANENTE");
    expect(readFileSync("AGENTS.md", "utf8")).toContain("docs/ordem-padrao-figaro.md");
    expect(readFileSync("CLAUDE.md", "utf8")).toContain("docs/ordem-padrao-figaro.md");
  });
});
