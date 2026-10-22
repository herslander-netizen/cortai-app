import { describe, expect, it } from "vitest";

import { trechosDoAjuste } from "./fantasma-do-horario";

const M = 60_000;
const f = (inicio: number, fim: number) => ({ inicio: inicio * M, fim: fim * M });

describe("trechosDoAjuste", () => {
  it("sem mudança, nada sai", () => {
    expect(trechosDoAjuste(f(60, 90), f(60, 90))).toEqual([]);
  });

  it("encurtar pelo fim deixa o trecho do fim translúcido", () => {
    expect(trechosDoAjuste(f(60, 90), f(60, 75))).toEqual([f(75, 90)]);
  });

  it("encurtar pelo início deixa o trecho do começo translúcido", () => {
    expect(trechosDoAjuste(f(60, 90), f(70, 90))).toEqual([f(60, 70)]);
  });

  it("estender a duração destaca o trecho acrescentado em transparência", () => {
    expect(trechosDoAjuste(f(60, 90), f(60, 120))).toEqual([f(90, 120)]);
  });

  it("mover para outro horário sem sobrepor tira o original inteiro", () => {
    expect(trechosDoAjuste(f(60, 90), f(120, 150))).toEqual([f(60, 90)]);
  });

  it("mover um pouco deixa só o pedaço que ficou para trás", () => {
    expect(trechosDoAjuste(f(60, 90), f(75, 105))).toEqual([f(60, 75)]);
  });

  it("original vazio não gera trecho", () => {
    expect(trechosDoAjuste(f(60, 60), f(60, 90))).toEqual([]);
  });
});
