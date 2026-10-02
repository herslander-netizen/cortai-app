import { describe, expect, it } from "vitest";

import {
  decidirFimDoGesto,
  definirVizinhoDoGesto,
  limitarDeslocamento,
  movimentoRecente,
  travarEixo,
  vizinhoDoGesto,
  type InicioDoGesto,
} from "./gesto-dia";

const base: InicioDoGesto = {
  x: 200,
  y: 300,
  larguraTela: 390,
  dentroDeRolagemLateral: false,
  arrastando: false,
};


describe("travarEixo", () => {
  it("só decide depois de ~10 px e mantém a decisão", () => {
    expect(travarEixo(4, 3)).toBe(null);
    expect(travarEixo(12, 2)).toBe("x");
    expect(travarEixo(2, -12)).toBe("y");
    expect(travarEixo(80, 0, "y")).toBe("y");
  });
});

describe("limitarDeslocamento", () => {
  it("não passa da largura da tela", () => {
    expect(limitarDeslocamento(500, 390)).toBe(390);
    expect(limitarDeslocamento(-500, 390)).toBe(-390);
    expect(limitarDeslocamento(120, 390)).toBe(120);
  });
});

describe("decidirFimDoGesto", () => {
  const f = { inicio: base, eixo: "x" as const, largura: 390, velocidade: 0, distanciaRecente: 0 };
  it("completa ao passar da metade", () => {
    expect(decidirFimDoGesto({ ...f, dx: -200 })).toBe(1);
    expect(decidirFimDoGesto({ ...f, dx: 200 })).toBe(-1);
    expect(decidirFimDoGesto({ ...f, dx: -150 })).toBe(0);
  });
  it("completa com peteleco (0,5 px/ms e 50 px em 250 ms)", () => {
    expect(decidirFimDoGesto({ ...f, dx: -80, velocidade: -0.8, distanciaRecente: -70 })).toBe(1);
    expect(decidirFimDoGesto({ ...f, dx: -80, velocidade: -0.8, distanciaRecente: -30 })).toBe(0);
    expect(decidirFimDoGesto({ ...f, dx: -80, velocidade: -0.3, distanciaRecente: -70 })).toBe(0);
  });
  it("cancelado, vertical, borda e arraste nunca trocam", () => {
    expect(decidirFimDoGesto({ ...f, dx: -300, cancelado: true })).toBe(0);
    expect(decidirFimDoGesto({ ...f, eixo: "y", dx: -300 })).toBe(0);
    expect(decidirFimDoGesto({ ...f, inicio: { ...base, x: 10 }, dx: -300 })).toBe(0);
    expect(decidirFimDoGesto({ ...f, dx: -300, arrastandoNoFim: true })).toBe(0);
  });
  it("mede o movimento recente", () => {
    const m = movimentoRecente(
      [
        { x: 0, t: 0 },
        { x: 100, t: 400 },
        { x: 160, t: 500 },
      ],
      500,
    );
    expect(m.distancia).toBe(60);
    expect(m.velocidade).toBeCloseTo(0.6);
  });
});

describe("vizinhoDoGesto", () => {
  it("guarda o dia vizinho fora do React", () => {
    definirVizinhoDoGesto(1);
    expect(vizinhoDoGesto()).toBe(1);
    definirVizinhoDoGesto(0);
    expect(vizinhoDoGesto()).toBe(0);
  });
});
