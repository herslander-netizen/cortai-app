/* eslint-disable @typescript-eslint/no-explicit-any -- banco simulado */
import { beforeEach, describe, expect, it } from "vitest";
import { criarBancoFalso } from "./banco-falso.apoio";
import {
  mensagemComEscolha,
  opcoesDeClientes,
  validarClienteEscolhido,
} from "./escolha-de-cliente";

const ID1 = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";

describe("opcoesDeClientes", () => {
  it("só há pop-up quando existe mais de um candidato", () => {
    expect(
      opcoesDeClientes({ clientes: [{ id: ID1, nome: "Leandro Silva", telefoneFinal: "4321" }] }),
    ).toEqual([]);
    expect(opcoesDeClientes({ clientes: [] })).toEqual([]);
    expect(opcoesDeClientes(null)).toEqual([]);
    expect(opcoesDeClientes("texto")).toEqual([]);
  });

  it("monta rótulo e detalhe que diferenciam os homônimos", () => {
    const o = opcoesDeClientes({
      clientes: [
        { id: ID1, nome: "Leandro Silva", telefoneFinal: "4321" },
        { id: ID2, nome: "Leandro Silva", telefoneFinal: null },
      ],
    });
    expect(o).toEqual([
      { tipo: "cliente", id: ID1, rotulo: "Leandro Silva", detalhe: "final 4321" },
      { tipo: "cliente", id: ID2, rotulo: "Leandro Silva", detalhe: null },
    ]);
  });

  it("limita a 6 e ignora itens malformados", () => {
    const muitos = Array.from({ length: 9 }, (_, i) => ({
      id: `id-${i}`,
      nome: `Leandro ${i}`,
      telefoneFinal: "1",
    }));
    expect(opcoesDeClientes({ clientes: muitos })).toHaveLength(6);
    expect(
      opcoesDeClientes({
        clientes: [
          { id: 1, nome: "x" },
          { nome: "y" },
          { id: "a", nome: "b" },
          { id: "c", nome: "d" },
        ],
      }),
    ).toHaveLength(2);
  });
});

describe("validarClienteEscolhido", () => {
  let banco: ReturnType<typeof criarBancoFalso>;
  beforeEach(() => {
    banco = criarBancoFalso({
      clientes: [
        {
          id: ID1,
          tenant_id: "t1",
          nome: "Leandro Silva",
          telefone: "5511988884321",
          arquivado_em: null,
        },
        {
          id: ID2,
          tenant_id: "outro",
          nome: "Leandro Alheio",
          telefone: "5511977770001",
          arquivado_em: null,
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          tenant_id: "t1",
          nome: "Antigo",
          telefone: null,
          arquivado_em: "2026-01-01",
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          tenant_id: "t1",
          nome: null,
          telefone: null,
          arquivado_em: null,
        },
      ],
    });
  });

  it("aceita cliente ativo do próprio negócio, só com o final do telefone", async () => {
    expect(await validarClienteEscolhido(banco as any, "t1", ID1)).toEqual({
      id: ID1,
      nome: "Leandro Silva",
      telefoneFinal: "4321",
    });
  });

  it("recusa cliente de OUTRO negócio, arquivado, sem nome, inexistente ou id malformado", async () => {
    expect(await validarClienteEscolhido(banco as any, "t1", ID2)).toBeNull();
    expect(
      await validarClienteEscolhido(banco as any, "t1", "33333333-3333-4333-8333-333333333333"),
    ).toBeNull();
    expect(
      await validarClienteEscolhido(banco as any, "t1", "44444444-4444-4444-8444-444444444444"),
    ).toBeNull();
    expect(
      await validarClienteEscolhido(banco as any, "t1", "55555555-5555-4555-8555-555555555555"),
    ).toBeNull();
    expect(await validarClienteEscolhido(banco as any, "t1", "1 or 1=1")).toBeNull();
  });
});

describe("mensagemComEscolha", () => {
  it("passa ao modelo só o id validado, nunca o nome (dado de terceiros)", () => {
    const m = mensagemComEscolha("Leandro Silva (final 4321)", ID1);
    expect(m).toContain(ID1);
    expect(m.startsWith("Leandro Silva (final 4321)")).toBe(true);
    expect(m).toMatch(/não busque o cliente de novo/);
  });
});
