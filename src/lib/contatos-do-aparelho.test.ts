import { describe, expect, it, vi } from "vitest";

import { selecionarContatoDoAparelho } from "./contatos-do-aparelho";

describe("selecionarContatoDoAparelho", () => {
  it("solicita somente nome e telefone de um contato escolhido pelo usuário", async () => {
    const select = vi.fn().mockResolvedValue([
      { name: ["  Ana Souza  "], tel: [" +55 (79) 99999-1234 "] },
    ]);

    await expect(
      selecionarContatoDoAparelho({ contacts: { select } }),
    ).resolves.toEqual({ nome: "Ana Souza", telefone: "+55 (79) 99999-1234" });

    expect(select).toHaveBeenCalledWith(["name", "tel"], { multiple: false });
  });

  it("retorna null quando o usuário cancela a seleção", async () => {
    const select = vi.fn().mockResolvedValue([]);
    await expect(
      selecionarContatoDoAparelho({ contacts: { select } }),
    ).resolves.toBeNull();
  });

  it("ignora um contato sem nome nem telefone utilizável", async () => {
    const select = vi.fn().mockResolvedValue([{ name: ["  "], tel: [] }]);
    await expect(
      selecionarContatoDoAparelho({ contacts: { select } }),
    ).resolves.toBeNull();
  });

  it("expõe indisponibilidade do navegador para a interface oferecer preenchimento manual", async () => {
    await expect(selecionarContatoDoAparelho({})).rejects.toThrow(
      "CONTATO_PICKER_INDISPONIVEL",
    );
  });

  it("preserva o telefone mesmo quando o contato não tem nome", async () => {
    const select = vi.fn().mockResolvedValue([{ tel: ["79999991234"] }]);
    await expect(
      selecionarContatoDoAparelho({ contacts: { select } }),
    ).resolves.toEqual({ nome: "", telefone: "79999991234" });
  });
});
