import { describe, expect, it, vi } from "vitest";

import { buscarCep, mascaraCep, montarEndereco } from "./cep";

describe("busca por CEP", () => {
  it("máscara e montagem do endereço com número", () => {
    expect(mascaraCep("49025abc100")).toBe("49025-100");
    const e = {
      cep: "49025-100",
      logradouro: "Rua das Acácias",
      bairro: "Jardins",
      cidade: "Aracaju",
      uf: "SE",
    };
    expect(montarEndereco(e, "120")).toBe("Rua das Acácias, 120 — Jardins, Aracaju/SE");
    expect(montarEndereco(e, "")).toBe("Rua das Acácias, s/n — Jardins, Aracaju/SE");
    expect(montarEndereco({ ...e, logradouro: "", bairro: "" }, "")).toBe("Aracaju/SE");
  });

  it("consulta o ViaCEP e trata CEP inexistente e falha como null", async () => {
    const ok = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            logradouro: "Rua A",
            bairro: "Centro",
            localidade: "Aracaju",
            uf: "SE",
          }),
        ),
    );
    expect(await buscarCep("49000-000", ok as never)).toMatchObject({
      bairro: "Centro",
      cidade: "Aracaju",
    });
    expect(ok).toHaveBeenCalledWith("https://viacep.com.br/ws/49000000/json/", expect.anything());
    const inexistente = vi.fn(async () => new Response(JSON.stringify({ erro: true })));
    expect(await buscarCep("00000000", inexistente as never)).toBeNull();
    const fora = vi.fn(async () => {
      throw new Error("rede");
    });
    expect(await buscarCep("49000000", fora as never)).toBeNull();
    expect(await buscarCep("123", ok as never)).toBeNull();
  });
});
