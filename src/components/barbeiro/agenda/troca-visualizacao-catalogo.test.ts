import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const transicao = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.tsx", "utf8");
const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");
const estilos = readFileSync("src/styles.css", "utf8");

describe("transição Catálogo aplicada somente aos painéis da Agenda", () => {
  it("usa deslizamento horizontal entre Cartões e Timeline no celular", () => {
    expect(transicao).toContain('chave === "lista" ? "100%" : "-100%"');
    expect(transicao).toContain("initial={reduzirMovimento ? false : inicial}");
    expect(transicao).toContain('mode="popLayout"');
    expect(transicao).toContain("const final = celular");
    expect(operacional).toContain("celular={celular}");
  });

  it("preserva redução de movimento e a transição anterior no desktop", () => {
    expect(transicao).toContain("duration: 0");
    expect(transicao).toContain("{ opacity: 0, y: 28 }");
    expect(transicao).toContain("{ opacity: 0, y: -20 }");
  });

  it("mantém o botão Agora e o FAB fora do painel e do palco do gesto", () => {
    const fimDoPalco = operacional.indexOf('      </div>\n\n      {/* Celular na grade:');
    const botao = operacional.indexOf("<BotaoAgoraPrincipal", fimDoPalco);
    const painel = operacional.indexOf('<div\n          id="agenda-painel-visualizacao"');
    const fimDoPainel = operacional.indexOf("</TrocaDeVisualizacao>");
    expect(painel).toBeGreaterThan(-1);
    expect(fimDoPainel).toBeGreaterThan(painel);
    expect(fimDoPalco).toBeGreaterThan(fimDoPainel);
    expect(botao).toBeGreaterThan(fimDoPalco);
    expect(estilos).toMatch(/\.agenda-botao-agora-principal \{\s*position: fixed;/);
    expect(estilos).toMatch(/\.agenda-acao-fixa \{\s*position: fixed;/);
    expect(estilos).toMatch(/\.agenda-botao-agora-principal button\.agenda-botao-agora-visualizacao:active \{\s*transform: none;/);
  });

  it("limita a saída lateral ao painel sem bloquear a rolagem vertical", () => {
    expect(estilos).toMatch(/#agenda-painel-visualizacao \{\s*overflow-x: clip;/);
    expect(estilos).not.toMatch(/#agenda-painel-visualizacao \{\s*overflow: hidden;/);
  });
});
