import { describe, expect, it } from "vitest";
import { SEGMENTOS } from "@/lib/segmentos";
import { resolverFundoDoChat } from "./fundo-chat";

const fundoFlow = "/assets/fundo-flow.webp";

describe("resolverFundoDoChat", () => {
  it("preserva a foto escolhida pelo estabelecimento sem misturar sugestões", () => {
    expect(resolverFundoDoChat({
      modo: "capa", capaUrl: "https://cdn.test/tenant/capa.webp", segmento: "barbearia", fundoFlow,
    })).toEqual({ imagem: "https://cdn.test/tenant/capa.webp", padraoSegmento: null });
  });
  it("gera pattern categorizado somente quando o modo Capa está sem foto", () => {
    for (const segmento of SEGMENTOS) {
      expect(resolverFundoDoChat({ modo: "capa", segmento, fundoFlow }))
        .toEqual({ imagem: null, padraoSegmento: segmento });
    }
  });
  it("mantém o comportamento das opções Padrão e Liso", () => {
    expect(resolverFundoDoChat({ modo: "padrao", segmento: "salao", fundoFlow }))
      .toEqual({ imagem: fundoFlow, padraoSegmento: null });
    expect(resolverFundoDoChat({ modo: "liso", capaUrl: "/minha-foto.webp", segmento: "salao", fundoFlow }))
      .toEqual({ imagem: null, padraoSegmento: null });
  });
  it("mantém o fallback original quando o segmento ainda não foi informado", () => {
    expect(resolverFundoDoChat({ modo: "capa", fundoFlow }))
      .toEqual({ imagem: fundoFlow, padraoSegmento: null });
  });
});
