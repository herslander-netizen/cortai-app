import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const transicao = readFileSync("src/components/barbeiro/agenda/TrocaDeVisualizacao.tsx", "utf8");
const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");
const botao = readFileSync("src/components/barbeiro/agenda/BotaoAgoraPrincipal.tsx", "utf8");
const estilos = readFileSync("src/styles.css", "utf8");

describe("Catálogo: microanimação SOMENTE no ícone do botão Cards", () => {
  it("restaura exatamente a animação dos painéis anterior à alteração lateral", () => {
    expect(transicao).toContain('initial={reduzirMovimento ? false : { opacity: 0, y: 28 }}');
    expect(transicao).toContain("animate={{ opacity: 1, y: 0 }}");
    expect(transicao).not.toContain('chave === "lista" ? "100%" : "-100%"');
    expect(operacional).toContain('<TrocaDeVisualizacao chave={celular && visualizacao === "lista" ? "lista" : "grade"}>');
    expect(estilos).not.toContain("#agenda-painel-visualizacao {\n    overflow-x: clip;");
  });

  it("anima apenas traços da lista e a caixa do ícone Catálogo, sem mover o botão", () => {
    expect(botao).toContain("data-animacao={visaoAcionadaPeloBotao.current === visualizacao || undefined}");
    expect(botao).toContain('className="agenda-icone-catalogo-caixa"');
    expect(botao).toContain('className="agenda-icone-cards-linha"');
    expect(estilos).toContain("@keyframes agenda-icone-catalogo-acionar");
    expect(estilos).toContain("@keyframes agenda-icone-cards-desenhar");
    expect(estilos).toContain("@keyframes agenda-icone-catalogo-tampa");
    expect(estilos).toContain("animation: agenda-icone-catalogo-acionar 520ms");
    expect(estilos).toContain("transform-origin: center top;");
    expect(estilos).toMatch(/button\.agenda-botao-agora-visualizacao:active \{\s*transform: none;/);
    expect(botao).not.toContain("rotate:");
    expect(botao).toContain("key={proxima}");
    expect(botao).not.toContain("AnimatePresence");
    expect(botao).not.toContain("<motion.span");
  });

  it("só dispara o efeito após acionamento e respeita movimento reduzido", () => {
    expect(botao).toContain("visaoAcionadaPeloBotao.current = destino;");
    expect(botao).toContain("onAnimationEnd");
    expect(botao).toContain("visaoAcionadaPeloBotao.current = null;");
    expect(estilos).toContain("@media (prefers-reduced-motion: reduce) {");
    expect(estilos).toContain(".agenda-icone-catalogo-caixa,");
    expect(estilos).toContain(".agenda-icone-catalogo-tampa,");
    expect(estilos).toContain("animation: none;");
  });
});
