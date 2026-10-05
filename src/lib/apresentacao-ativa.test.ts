import { describe, expect, it } from "vitest";
import { apresentacaoAtiva, destinoDaApresentacao } from "./apresentacao-ativa";

describe("apresentação ativa", () => {
  it("padrão e erro de leitura viram ativa", () => {
    expect(apresentacaoAtiva(undefined)).toBe(true);
    expect(apresentacaoAtiva(null)).toBe(true);
    expect(apresentacaoAtiva(true)).toBe(true);
    expect(apresentacaoAtiva(false)).toBe(false);
  });
  it("desativada leva visitante à entrada; logado não é afetado", () => {
    expect(destinoDaApresentacao(false, false)).toBe("/login");
    expect(destinoDaApresentacao(true, false)).toBeNull();
    expect(destinoDaApresentacao(false, true)).toBeNull();
  });
});
