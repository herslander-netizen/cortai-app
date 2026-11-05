import { describe, expect, it } from "vitest";

import { chaveDoNumero, mesmoNumero, numeroParaCadastro } from "./numero-do-negocio";

describe("número do negócio", () => {
  it("mesmo número escrito de jeitos diferentes", () => {
    expect(mesmoNumero("79991787208", "+55 (79) 99178-7208")).toBe(true);
    // O WhatsApp devolve o celular de DDD 79 sem o 9.
    expect(mesmoNumero("(79) 99818-1983", "557998181983")).toBe(true);
    expect(mesmoNumero("11987654321", "5511987654321")).toBe(true);
  });

  it("números diferentes (o caso do Teste01)", () => {
    expect(mesmoNumero("79991787208", "557998181983")).toBe(false);
    expect(mesmoNumero(null, "557998181983")).toBe(false);
  });

  it("chave sempre com 55", () => {
    expect(chaveDoNumero("79991787208")).toBe("557991787208");
    expect(chaveDoNumero("abc")).toBeNull();
  });

  it("conectado vai para o cadastro como a pessoa conhece (com o 9)", () => {
    expect(numeroParaCadastro("557998181983")).toBe("79998181983");
    expect(numeroParaCadastro("5511987654321")).toBe("11987654321");
    // Fixo (começa com 2–5) não ganha 9.
    expect(numeroParaCadastro("557932215566")).toBe("7932215566");
  });
});
