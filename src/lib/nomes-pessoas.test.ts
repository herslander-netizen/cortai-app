import { describe, expect, it } from "vitest";
import { clienteUnicoDoTelefone, nomeESobrenome, normalizarNomePessoa } from "./nomes-pessoas";

describe("identificação por nome e sobrenome", () => {
  it("aceita nome e sobrenome com acentos, partículas e espaços normalizados", () => {
    expect(nomeESobrenome("  Maria   de   Souza  ")).toBe("Maria de Souza");
    expect(nomeESobrenome("João D’Ávila")).toBe("João D’Ávila");
    expect(nomeESobrenome("Ana-Maria Silva")).toBe("Ana-Maria Silva");
    expect(normalizarNomePessoa(" João    Silva ")).toBe("João Silva");
  });

  it("não aceita só primeiro nome, só partículas, número ou entrada artificial", () => {
    for (const nome of ["Ana", "Maria de", "João da", "Ana123 Souza", "A@na Souza", "", "Ana "]) {
      expect(nomeESobrenome(nome), nome).toBeNull();
    }
    expect(nomeESobrenome("Maria ".repeat(20))).toBeNull();
  });

  it("um telefone compartilhado nunca escolhe um cadastro silenciosamente", () => {
    expect(clienteUnicoDoTelefone([])).toBeNull();
    expect(clienteUnicoDoTelefone([{ id: "1" }])).toEqual({ id: "1" });
    expect(() => clienteUnicoDoTelefone([{ id: "1" }, { id: "2" }])).toThrow(
      /mais de um cliente.*nome e sobrenome/i,
    );
  });
});
