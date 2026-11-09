import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fidelidade do Ver Exemplo em Layout & Tema ao Figaroo", () => {
  const codigo = readFileSync("src/routes/barbeiro.marca.layout-tema.tsx", "utf8");
  const exemplo = readFileSync("src/routes/barbeiro.marca.layout-tema_.preview.tsx", "utf8");

  it("abre a rota própria com layout e tema selecionados, em vez de desenhar uma sobreposição", () => {
    expect(codigo).toContain('to: "/barbeiro/marca/layout-tema/preview"');
    expect(codigo).toContain("search: { layout: e.config.layout, tema: e.config.tema }");
    expect(codigo).toContain("Ver Exemplo");
    expect(codigo).not.toContain("previaAberta");
    expect(codigo).not.toContain('role="dialog" aria-modal="true" aria-label="Prévia ao vivo');
  });

  it("a rota de exemplo já existente apresenta a página completa, não só uma imagem estática", () => {
    expect(exemplo).toContain('createFileRoute("/barbeiro/marca/layout-tema_/preview")');
    expect(exemplo).toContain("paginaDeExemplo(config)");
    expect(exemplo).toContain("PaginaPublicaConteudo");
    expect(exemplo).toContain("PreviaDireta");
    expect(exemplo).toContain("ChatPreview");
    expect(exemplo).toContain('voltarBusca={{ layout, tema }}');
  });

  it("não altera o fluxo real de rascunho nem a publicação", () => {
    expect(codigo).toContain("salvarRascunhoPagina");
    expect(codigo).toContain('e.executar("publish")');
    expect(codigo).toContain("Salvar rascunho");
  });
});
