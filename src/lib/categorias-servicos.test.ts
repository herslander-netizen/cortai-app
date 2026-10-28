import { describe, expect, it } from "vitest";

import { CORES_CATEGORIA, chaveCategoria, corPadraoCategoria } from "./categorias-servicos";

describe("categorias de serviços", () => {
  it("normaliza acentos e espaços sem alterar o rótulo exibido", () => {
    expect(chaveCategoria("  Sobrancelha  ")).toBe("sobrancelha");
    expect(chaveCategoria("CÓRTES")).toBe("cortes");
  });

  it("atribui uma cor de partida estável às categorias legadas", () => {
    expect(corPadraoCategoria("Cabelo")).toBe(corPadraoCategoria("  Cabelo "));
    expect(CORES_CATEGORIA.some((cor) => cor.valor === corPadraoCategoria("Cabelo"))).toBe(true);
  });

  it("usa apenas os tokens de cor aprovados pelo design system", () => {
    expect(CORES_CATEGORIA.every((cor) => cor.css.startsWith("var("))).toBe(true);
  });
});
