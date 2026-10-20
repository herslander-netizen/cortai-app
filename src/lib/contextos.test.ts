import { describe, expect, it } from "vitest";

import { decidirContextos, opcoesDeEntrada, precisaEscolherContexto } from "./contextos";

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

describe("opções da tela /escolher", () => {
  const negocio = (id: string, extra: Partial<{ acessoAtivo: boolean; ativa: boolean }> = {}) => ({
    id,
    nome: `Negócio ${id}`,
    segmento: id === "b" ? "salao" : "barbearia",
    acessoAtivo: true,
    ativa: true,
    ...extra,
  });

  it("lista cada negócio com acesso ativo e o ADM só para admin", () => {
    const opcoes = opcoesDeEntrada({
      adminDaPlataforma: true,
      negocios: [negocio("a"), negocio("b"), negocio("c", { acessoAtivo: false })],
    });
    expect(opcoes.map((o) => (o.tipo === "negocio" ? o.tenantId : o.tipo))).toEqual([
      "cliente",
      "a",
      "b",
      "admin",
    ]);
  });

  it("sem admin, sem cartão do ADM", () => {
    const opcoes = opcoesDeEntrada({ adminDaPlataforma: false, negocios: [negocio("a")] });
    expect(opcoes.some((o) => o.tipo === "admin")).toBe(false);
  });

  it("sem negócio ativo, oferece criar", () => {
    const opcoes = opcoesDeEntrada({
      adminDaPlataforma: false,
      negocios: [negocio("a", { ativa: false })],
    });
    expect(opcoes.map((o) => o.tipo)).toEqual(["cliente", "criar_negocio"]);
  });
});
