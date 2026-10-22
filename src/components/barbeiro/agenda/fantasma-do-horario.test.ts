import { describe, expect, it } from "vitest";

import { trechosQueSaem } from "./fantasma-do-horario";

const M = 60_000;
const f = (inicio: number, fim: number) => ({ inicio: inicio * M, fim: fim * M });

describe("trechosQueSaem", () => {
  it("sem mudança, nada sai", () => {
    expect(trechosQueSaem(f(60, 90), f(60, 90))).toEqual([]);
  });

  it("encurtar pelo fim deixa o trecho do fim translúcido", () => {
    expect(trechosQueSaem(f(60, 90), f(60, 75))).toEqual([f(75, 90)]);
  });

  it("encurtar pelo início deixa o trecho do começo translúcido", () => {
    expect(trechosQueSaem(f(60, 90), f(70, 90))).toEqual([f(60, 70)]);
  });

  it("estender não tira nada do original", () => {
    expect(trechosQueSaem(f(60, 90), f(60, 120))).toEqual([]);
  });

  it("mover para outro horário sem sobrepor tira o original inteiro", () => {
    expect(trechosQueSaem(f(60, 90), f(120, 150))).toEqual([f(60, 90)]);
  });

  it("mover um pouco deixa só o pedaço que ficou para trás", () => {
    expect(trechosQueSaem(f(60, 90), f(75, 105))).toEqual([f(60, 75)]);
  });

  it("original vazio não gera trecho", () => {
    expect(trechosQueSaem(f(60, 60), f(60, 90))).toEqual([]);
  });
});
