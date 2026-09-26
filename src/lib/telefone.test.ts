import { describe, expect, it } from "vitest";
import { mesmoTelefone, normalizarTelefone, variantesDoTelefone } from "./telefone";

describe("telefone normalizado", () => {
  it("adiciona o DDI e remove símbolos", () => {
    expect(normalizarTelefone("(11) 98765-4321")).toBe("5511987654321");
  });
  it("trata com e sem o 9 como o mesmo número", () => {
    expect(mesmoTelefone("5511987654321", "551187654321")).toBe(true);
    expect(mesmoTelefone("11 8765-4321", "+55 11 98765-4321")).toBe(true);
    expect(variantesDoTelefone("5511987654321")).toContain("551187654321");
  });
  it("não confunde números diferentes", () => {
    expect(mesmoTelefone("5511987654321", "5511987654322")).toBe(false);
  });
});
