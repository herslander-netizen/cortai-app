import { describe, expect, it } from "vitest";

import { decidirContextos, precisaEscolherContexto } from "./contextos";

const base = {
  temVinculoAtivo: false,
  tipoDoPerfil: null,
  fichasDeCliente: 0,
  contextoAtivo: null,
};

describe("contextos da conta", () => {
  it("só cliente: quem agendou e tem ficha", () => {
    expect(decidirContextos({ ...base, fichasDeCliente: 2 })).toEqual({
      cliente: true,
      negocio: false,
    });
  });

  it("só negócio: vínculo ativo e nenhuma ficha", () => {
    expect(decidirContextos({ ...base, temVinculoAtivo: true, tipoDoPerfil: "barbeiro" })).toEqual({
      cliente: false,
      negocio: true,
    });
  });

  it("cliente que cria negócio com o mesmo e-mail: uma conta, dois contextos", () => {
    expect(decidirContextos({ ...base, temVinculoAtivo: true, fichasDeCliente: 1 })).toEqual({
      cliente: true,
      negocio: true,
    });
  });

  it("dono que ativa o contexto cliente ganha o contexto sem nova conta", () => {
    expect(
      decidirContextos({ ...base, temVinculoAtivo: true, contextoAtivo: "cliente" }).cliente,
    ).toBe(true);
  });

  it("e-mail sozinho não dá acesso ao negócio", () => {
    expect(decidirContextos({ ...base, tipoDoPerfil: "barbeiro" }).negocio).toBe(false);
  });

  it("seletor: só com dois contextos; após entrar sempre, depois só sem escolha", () => {
    const ambos = { papel: "barbeiro", contextos: { cliente: true, negocio: true } };
    expect(precisaEscolherContexto({ ...ambos, contextoEscolhido: true }, true)).toBe(true);
    expect(precisaEscolherContexto({ ...ambos, contextoEscolhido: true })).toBe(false);
    expect(precisaEscolherContexto({ ...ambos, contextoEscolhido: false })).toBe(true);
    expect(
      precisaEscolherContexto(
        {
          papel: "cliente",
          contextos: { cliente: true, negocio: false },
          contextoEscolhido: false,
        },
        true,
      ),
    ).toBe(false);
    expect(precisaEscolherContexto({ ...ambos, papel: "admin", contextoEscolhido: false })).toBe(
      false,
    );
  });
});
