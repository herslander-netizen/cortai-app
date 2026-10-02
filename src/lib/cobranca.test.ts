import { describe, expect, it } from "vitest";

import {
  aplicarCupomAoValor,
  cpfCnpjValido,
  datasDoTeste,
  deveProcessarEvento,
  economiaAnual,
  estaPago,
  estaSuspenso,
  fimDoPeriodo,
  momentoDaTroca,
  statusPelaData,
  validarCupom,
  valorDaCobranca,
} from "./cobranca";
import type { Plano, Condicao } from "./monetizacao";

const plano: Plano = {
  id: "1",
  chave: "pro",
  nome: "Pro",
  descricao: null,
  precoMensalCentavos: 3990,
  precoAnualCentavos: 39900,
  diasTeste: 7,
  limiteProfissionais: 3,
  limiteClientes: null,
  limiteAgendamentosMes: null,
  limiteUnidades: null,
  ordem: 1,
  ativo: true,
};
const condicao = {
  planoChave: "pro",
  precoPersonalizadoCentavos: null,
  descontoPercentual: 10,
  descontoCentavos: 0,
  limites: {},
  recursos: [],
} as unknown as Condicao;

describe("preço", () => {
  it("aplica condição e cupom", () => {
    expect(valorDaCobranca({ plano, ciclo: "mensal", condicao }).base).toBe(3591);
    expect(
      valorDaCobranca({ plano, ciclo: "mensal", condicao, cupom: { tipo: "fixo", valor: 591 } })
        .comCupom,
    ).toBe(3000);
    expect(
      valorDaCobranca({ plano, ciclo: "anual", condicao: { ...condicao, planoChave: "studio" } })
        .base,
    ).toBe(39900);
    expect(aplicarCupomAoValor(1000, { tipo: "percentual", valor: 50 })).toBe(500);
  });
  it("valor anual e economia", () => {
    expect(economiaAnual(3990, 39900)).toEqual({ anual: 39900, economia: 7980, percentual: 17 });
  });
  it("valida cupom", () => {
    const c = {
      id: "c",
      codigo: "X",
      tipo: "percentual",
      valor: 10,
      inicio: "2026-01-01",
      fim: null,
      usos_max: 1,
      usos: 1,
      publico: "todos",
      planos: [],
      ativo: true,
      cobrancas_com_desconto: 1,
    };
    expect(validarCupom(c, { plano: "pro", tenantNovo: true, hoje: "2026-09-01" })).toMatch(
      /limite/,
    );
    expect(
      validarCupom({ ...c, usos: 0 }, { plano: "pro", tenantNovo: true, hoje: "2026-09-01" }),
    ).toBeNull();
    expect(
      validarCupom(
        { ...c, usos: 0, planos: ["studio"] },
        { plano: "pro", tenantNovo: true, hoje: "2026-09-01" },
      ),
    ).toMatch(/plano/);
  });
});

describe("datas e status", () => {
  it("teste e período", () => {
    expect(datasDoTeste(new Date("2026-09-01T10:00:00Z"), 7).primeiroVencimento).toBe("2026-09-08");
    expect(fimDoPeriodo("2026-01-31", "anual")).toBe("2027-01-31");
    expect(fimDoPeriodo("2026-09-10", "mensal")).toBe("2026-10-10");
  });
  it("tolerância e fim de teste", () => {
    const base = {
      hoje: "2026-09-20",
      testeFim: null,
      pagoAte: null,
      toleranciaDias: 7,
      cancelarNoFim: false,
    };
    expect(statusPelaData({ ...base, status: "pendente", proximoVencimento: "2026-09-10" })).toBe(
      "suspensa",
    );
    expect(statusPelaData({ ...base, status: "pendente", proximoVencimento: "2026-09-15" })).toBe(
      "pendente",
    );
    expect(
      statusPelaData({
        ...base,
        status: "teste",
        testeFim: "2026-09-19T10:00:00Z",
        proximoVencimento: "2026-09-19",
      }),
    ).toBe("pendente");
    expect(
      statusPelaData({
        ...base,
        status: "ativa",
        pagoAte: "2026-09-10",
        cancelarNoFim: true,
        proximoVencimento: null,
      }),
    ).toBe("cancelada");
    expect(statusPelaData({ ...base, status: "cortesia", proximoVencimento: "2020-01-01" })).toBe(
      "cortesia",
    );
  });
  it("suspensão só com cobrança ligada", () => {
    expect(estaSuspenso(false, "suspensa")).toBe(false);
    expect(estaSuspenso(true, "suspensa")).toBe(true);
    expect(estaSuspenso(true, null)).toBe(false);
  });
});

describe("pagamento e webhook", () => {
  it("pago por forma", () => {
    expect(estaPago("CONFIRMED", "PIX")).toBe(false);
    expect(estaPago("RECEIVED", "PIX")).toBe(true);
    expect(estaPago("CONFIRMED", "CREDIT_CARD")).toBe(true);
    expect(estaPago("CONFIRMED", "BOLETO")).toBe(true);
    expect(estaPago("PENDING", "BOLETO")).toBe(false);
  });
  it("evento repetido não processa duas vezes", () => {
    expect(deveProcessarEvento(null)).toBe(true);
    expect(deveProcessarEvento({ status: "erro" })).toBe(true);
    expect(deveProcessarEvento({ status: "processado" })).toBe(false);
  });
  it("momento da troca", () => {
    expect(
      momentoDaTroca({
        valorAtual: 1990,
        valorNovo: 3990,
        cicloAtual: "mensal",
        cicloNovo: "mensal",
      }),
    ).toBe("agora");
    expect(
      momentoDaTroca({
        valorAtual: 3990,
        valorNovo: 1990,
        cicloAtual: "mensal",
        cicloNovo: "mensal",
      }),
    ).toBe("renovacao");
    expect(
      momentoDaTroca({
        valorAtual: 1990,
        valorNovo: 19900,
        cicloAtual: "mensal",
        cicloNovo: "anual",
      }),
    ).toBe("renovacao");
  });
  it("CPF/CNPJ", () => {
    expect(cpfCnpjValido("529.982.247-25")).toBe(true);
    expect(cpfCnpjValido("111.111.111-11")).toBe(false);
    expect(cpfCnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cpfCnpjValido("11.222.333/0001-80")).toBe(false);
  });
});
