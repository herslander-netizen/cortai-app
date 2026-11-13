import { describe, expect, it } from "vitest";

import {
  economiaDoPacote,
  erroPrecoDoConjunto,
  precoAvulsoDoConjunto,
} from "./pacotes";

const itens = [
  { quantidade: 3, precoCentavos: 2_500 },
  { quantidade: 2, precoCentavos: 4_000 },
];

describe("Figaroo → Flow: preço e desconto de pacotes e combos", () => {
  it("pacote de várias visitas considera a quantidade de cada serviço", () => {
    expect(precoAvulsoDoConjunto("pacote", itens)).toBe(15_500);
  });

  it("combo na mesma visita considera uma unidade por serviço, inclusive após trocar de pacote", () => {
    expect(precoAvulsoDoConjunto("combo", itens)).toBe(6_500);
    expect(
      precoAvulsoDoConjunto("combo", itens.map((item) => ({ ...item, quantidade: 1 }))),
    ).toBe(6_500);
  });

  it("preço igual ao valor avulso é válido; acima do avulso não é", () => {
    expect(erroPrecoDoConjunto(15_500, 15_500)).toBeNull();
    expect(erroPrecoDoConjunto(14_000, 15_500)).toBeNull();
    expect(erroPrecoDoConjunto(15_501, 15_500)).toMatch(/não pode ultrapassar/);
  });

  it("valor acima do total de um combo é inválido, mesmo quando seria válido para um pacote", () => {
    const preco = 7_000;
    expect(erroPrecoDoConjunto(preco, precoAvulsoDoConjunto("pacote", itens))).toBeNull();
    expect(erroPrecoDoConjunto(preco, precoAvulsoDoConjunto("combo", itens))).not.toBeNull();
  });

  it("valor zero não cria desconto negativo e não permite cobrança maior que serviços grátis", () => {
    expect(erroPrecoDoConjunto(0, 0)).toBeNull();
    expect(erroPrecoDoConjunto(1, 0)).not.toBeNull();
    expect(economiaDoPacote({ precoCentavos: 1_500, itens: [{ quantidade: 1, precoCentavos: 1_000 }] }))
      .toEqual({ centavos: 0, percentual: 0 });
  });

  it("não aceita preço negativo, fracionário, infinito ou cálculo avulso inválido", () => {
    for (const preco of [-1, 3.5, Infinity, Number.NaN]) {
      expect(erroPrecoDoConjunto(preco, 10_000)).toBeTruthy();
    }
    expect(erroPrecoDoConjunto(5_000, Number.POSITIVE_INFINITY)).toBeTruthy();
  });
});
