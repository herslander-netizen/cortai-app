import { describe, expect, it } from "vitest";

import { ambienteDaChave, asaasBaseUrl } from "./asaas.server";

describe("configuração do Asaas", () => {
  it("reconhece uma chave de produção pelo prefixo oficial", () => {
    expect(ambienteDaChave("$aact_prod_exemplo")).toBe("producao");
  });

  it("reconhece uma chave de sandbox pelo prefixo oficial", () => {
    expect(ambienteDaChave("$aact_hmlg_exemplo")).toBe("sandbox");
  });

  it("recusa qualquer outro prefixo", () => {
    expect(ambienteDaChave("chave_invalida")).toBe("invalida");
  });

  it("escolhe a API correspondente sem incluir a chave na URL", () => {
    const chave = "$aact_prod_segredo";
    const url = asaasBaseUrl(chave);
    expect(url).toBe("https://api.asaas.com/v3");
    expect(url).not.toContain(chave);
  });
});
