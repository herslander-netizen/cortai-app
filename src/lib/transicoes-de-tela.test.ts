// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  entradaDaTela,
  nivelDaRota,
  saidaDaTela,
  copiaDaTela,
  sentidoDaNavegacao,
  telaNoLugar,
  tipoDaTransicao,
} from "./transicoes-de-tela";

describe("nivelDaRota", () => {
  it("trata a Agenda como raiz e conta a profundidade dentro da área do negócio", () => {
    expect(nivelDaRota("/barbeiro")).toBe(0);
    expect(nivelDaRota("/barbeiro/")).toBe(0);
    expect(nivelDaRota("/barbeiro/agenda")).toBe(0);
    expect(nivelDaRota("/barbeiro/servicos")).toBe(1);
    expect(nivelDaRota("/barbeiro/clientes/abc")).toBe(2);
    expect(nivelDaRota("/barbeiro/marca/layout-tema/preview")).toBe(3);
  });

  it("fica de fora em rotas que não são da área do negócio", () => {
    expect(nivelDaRota("/agendar/barbearia-prime")).toBeNull();
    expect(nivelDaRota("/barbeiros")).toBeNull();
    expect(nivelDaRota("/admin")).toBeNull();
  });
});

describe("tipoDaTransicao", () => {
  it("usa a gaveta entre a Agenda e uma área", () => {
    expect(tipoDaTransicao("/barbeiro", "/barbeiro/servicos")).toBe("gaveta");
    expect(tipoDaTransicao("/barbeiro/equipe", "/barbeiro/agenda")).toBe("gaveta");
  });

  it("usa o deslize interno para telas dentro da área e entre áreas", () => {
    expect(tipoDaTransicao("/barbeiro/marca", "/barbeiro/marca/layout-tema")).toBe("intra");
    expect(tipoDaTransicao("/barbeiro/clientes/abc", "/barbeiro/clientes")).toBe("intra");
    expect(tipoDaTransicao("/barbeiro/mais", "/barbeiro/conta")).toBe("intra");
    expect(tipoDaTransicao("/barbeiro", "/barbeiro/clientes/abc")).toBe("intra");
  });

  it("sobe de baixo ao abrir ou fechar onboarding e assinatura", () => {
    expect(tipoDaTransicao("/barbeiro", "/barbeiro/configurar")).toBe("cruzada");
    expect(tipoDaTransicao("/barbeiro/plano", "/barbeiro/conta")).toBe("cruzada");
  });

  it("mantém o esmaecer fora da área do negócio", () => {
    expect(tipoDaTransicao("/login", "/barbeiro")).toBe("esmaecer");
    expect(tipoDaTransicao("/app", "/app/perfil")).toBe("esmaecer");
  });
});

describe("sentidoDaNavegacao", () => {
  it("abre e fecha a gaveta pela estrutura, sem depender do histórico", () => {
    expect(sentidoDaNavegacao("/barbeiro", "/barbeiro/servicos", 4, 5)).toBe("avancar");
    expect(sentidoDaNavegacao("/barbeiro/servicos", "/barbeiro", 5, 6)).toBe("voltar");
  });

  it("abre e fecha o fluxo cruzado pela estrutura", () => {
    expect(sentidoDaNavegacao("/barbeiro", "/barbeiro/configurar", 1, 2)).toBe("avancar");
    expect(sentidoDaNavegacao("/barbeiro/configurar", "/barbeiro", 2, 3)).toBe("voltar");
  });

  it("usa o índice do histórico nas telas internas", () => {
    expect(sentidoDaNavegacao("/barbeiro/marca", "/barbeiro/marca/layout-tema", 3, 4)).toBe(
      "avancar",
    );
    expect(sentidoDaNavegacao("/barbeiro/marca/layout-tema", "/barbeiro/marca", 4, 3)).toBe(
      "voltar",
    );
  });

  it("sem índice, decide pela profundidade", () => {
    expect(sentidoDaNavegacao("/barbeiro/marca/layout-tema", "/barbeiro/marca")).toBe("voltar");
    expect(sentidoDaNavegacao("/barbeiro/marca", "/barbeiro/marca/layout-tema")).toBe("avancar");
    expect(sentidoDaNavegacao("/barbeiro/mais", "/barbeiro/conta", 2, 2)).toBe("avancar");
  });
});

describe("movimentos", () => {
  const base = { menosMovimento: false } as const;

  it("intra: 20 % da largura com esmaecer, 300 ms, nos dois sentidos", () => {
    const avancar = { ...base, tipo: "intra", sentido: "avancar" } as const;
    expect(entradaDaTela(avancar)).toMatchObject({ x: "20%", opacity: 0 });
    expect(saidaDaTela(avancar)).toMatchObject({
      x: "-20%",
      opacity: 0,
      transition: { duration: 0.3 },
    });
    const voltar = { ...base, tipo: "intra", sentido: "voltar" } as const;
    expect(entradaDaTela(voltar)).toMatchObject({ x: "-20%" });
    expect(saidaDaTela(voltar)).toMatchObject({ x: "20%" });
  });

  it("cruzada: a tela nova sobe e a de trás só esmaece; ao fechar, o fluxo desce por cima", () => {
    const abrir = { ...base, tipo: "cruzada", sentido: "avancar" } as const;
    expect(entradaDaTela(abrir)).toMatchObject({ y: "100vh", opacity: 0 });
    expect(saidaDaTela(abrir)).not.toHaveProperty("y");
    expect(telaNoLugar(abrir)).toMatchObject({ transition: { duration: 0.35 } });
    const fechar = { ...base, tipo: "cruzada", sentido: "voltar" } as const;
    expect(entradaDaTela(fechar)).toEqual({ opacity: 0 });
    expect(saidaDaTela(fechar)).toMatchObject({ y: "100vh", zIndex: 1 });
  });

  it("gaveta: largura inteira com mola sem quique e sem esmaecer", () => {
    const abrir = { ...base, tipo: "gaveta", sentido: "avancar" } as const;
    expect(entradaDaTela(abrir)).toMatchObject({ x: "100%" });
    expect(entradaDaTela(abrir)).not.toHaveProperty("opacity");
    const mola = telaNoLugar(abrir).transition as {
      stiffness: number;
      damping: number;
      mass: number;
    };
    expect(mola.stiffness).toBe(1500);
    expect(mola.damping / (2 * Math.sqrt(mola.stiffness * mola.mass))).toBeCloseTo(1);
    expect(saidaDaTela({ ...base, tipo: "gaveta", sentido: "voltar" })).toMatchObject({
      x: "100%",
    });
  });

  it("a tela que sai fica atrás da nova, exceto o fluxo cruzado que desce por cima", () => {
    for (const tipo of ["intra", "gaveta"] as const) {
      expect(saidaDaTela({ ...base, tipo, sentido: "avancar" })).toMatchObject({ zIndex: -1 });
      expect(entradaDaTela({ ...base, tipo, sentido: "avancar" })).not.toHaveProperty("position");
    }
    expect(saidaDaTela({ ...base, tipo: "cruzada", sentido: "avancar" })).toMatchObject({
      zIndex: -1,
    });
    expect(saidaDaTela({ ...base, tipo: "cruzada", sentido: "voltar" })).toMatchObject({
      zIndex: 1,
    });
  });

  it("com menos movimento, só esmaece", () => {
    const e = { tipo: "gaveta", sentido: "avancar", menosMovimento: true } as const;
    expect(entradaDaTela(e)).toEqual({ opacity: 0 });
    expect(saidaDaTela(e)).not.toHaveProperty("x");
  });
});

describe("copiaDaTela", () => {
  it("copia a tela sem ids e sem recarregar iframes", () => {
    const tela = document.createElement("main");
    tela.id = "pagina";
    tela.innerHTML =
      '<h1 id="titulo">Serviços</h1><input id="busca" autofocus /><iframe src="https://exemplo.com"></iframe><p>texto</p>';
    const copia = copiaDaTela(tela);
    expect(copia.textContent).toContain("Serviços");
    expect(copia.querySelector("p")?.textContent).toBe("texto");
    expect(copia.id).toBe("");
    expect(copia.querySelectorAll("[id]")).toHaveLength(0);
    expect(copia.querySelector("[autofocus]")).toBeNull();
    expect(copia.querySelector("iframe")).toBeNull();
    expect(tela.querySelector("iframe")).not.toBeNull();
    expect(tela.querySelector("#titulo")).not.toBeNull();
  });
});
