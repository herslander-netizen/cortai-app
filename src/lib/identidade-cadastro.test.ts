import { describe, expect, it } from "vitest";
import { aplicarIdentidadeDoCadastro } from "@/lib/identidade-cadastro";

const paleta = {
  principal: "#76401B",
  secundaria: "#FCF4EF",
  destaque: "#D8B68E",
};

describe("identidade do cadastro nas páginas públicas", () => {
  it("publica a paleta sem destruir layout nem configurações do chat", () => {
    const anterior = {
      pagina: {
        tema: "classico",
        layout: "logo-central",
        chat: { modo: "conversa" },
        cores: { principal: "#111111", botao: "#111111", texto: "#EEEEEE" },
        campoFuturo: true,
      },
      outroCampo: "preservado",
    };
    const resultado = aplicarIdentidadeDoCadastro(anterior, paleta, {
      nome: "Criollo Barbeiro",
      logo_url: "tenant/logo.jpg",
    });
    expect(resultado).toMatchObject({
      pagina: {
        tema: "classico",
        layout: "logo-central",
        chat: { modo: "conversa" },
        campoFuturo: true,
        cores: {
          principal: "#76401B",
          secundaria: "#FCF4EF",
          botao: "#76401B",
          fundo: "#FCF4EF",
          destaque: "#D8B68E",
        },
      },
      marca: { nome: "Criollo Barbeiro", logo_url: "tenant/logo.jpg" },
      outroCampo: "preservado",
    });
    expect(anterior.pagina.cores.principal).toBe("#111111");
  });

  it("cria uma página com identidade para novo negócio ainda sem configuração", () => {
    const resultado = aplicarIdentidadeDoCadastro(null, paleta, {
      nome: "Novo negócio",
      logo_url: "novo/logo.webp",
    });
    expect(resultado).toMatchObject({
      pagina: { cores: { principal: "#76401B", fundo: "#FCF4EF" } },
      marca: { logo_url: "novo/logo.webp" },
    });
  });

  it("atualiza só a marca ao receber uma nova logo sem alterar cores", () => {
    const resultado = aplicarIdentidadeDoCadastro(
      { pagina: { cores: { principal: "#123456" }, chat: { modo: "tradicional" } } },
      null,
      { logo_url: "novo/logo.webp" },
    );
    expect(resultado).toMatchObject({
      pagina: { cores: { principal: "#123456" }, chat: { modo: "tradicional" } },
      marca: { logo_url: "novo/logo.webp" },
    });
  });
});
