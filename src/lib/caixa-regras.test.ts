import { describe, expect, it } from "vitest";
import {
  calcularDiferencaDoFechamento,
  calcularSaldoEsperadoNaGaveta,
} from "./caixa-regras";

describe("cálculo físico da gaveta", () => {
  it("inclui saldo inicial e movimentos em dinheiro, mas exclui Pix e cartão", () => {
    const esperado = calcularSaldoEsperadoNaGaveta(10_000, [
      { tipo: "entrada", valor_centavos: 50_000, forma_pagamento: "dinheiro" },
      { tipo: "entrada", valor_centavos: 80_000, forma_pagamento: "pix" },
      { tipo: "entrada", valor_centavos: 20_000, forma_pagamento: "cartao" },
      { tipo: "sangria", valor_centavos: 2_000, forma_pagamento: "dinheiro" },
      { tipo: "despesa", valor_centavos: 10_000, forma_pagamento: "pix" },
      { tipo: "estorno", valor_centavos: 5_000, forma_pagamento: "cartao" },
    ]);
    expect(esperado).toBe(58_000);
  });

  it("preserva a interpretação dos lançamentos antigos sem forma de pagamento", () => {
    const esperado = calcularSaldoEsperadoNaGaveta(20_000, [
      { tipo: "saida", valor_centavos: 3_000, forma_pagamento: null },
      { tipo: "despesa", valor_centavos: 2_000 },
      { tipo: "entrada", valor_centavos: 9_000, forma_pagamento: null },
    ]);
    expect(esperado).toBe(15_000);
  });

  it("calcula falta, sobra e contagem exata com sinal consistente", () => {
    expect(calcularDiferencaDoFechamento(10_000, 8_500)).toBe(-1_500);
    expect(calcularDiferencaDoFechamento(10_000, 12_500)).toBe(2_500);
    expect(calcularDiferencaDoFechamento(10_000, 10_000)).toBe(0);
  });
});
