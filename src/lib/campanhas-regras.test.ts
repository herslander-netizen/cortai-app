import { describe, expect, it } from "vitest";
import {
  avaliarCupom,
  estadoDaCampanha,
  normalizarCodigoCupom,
  validarConfiguracaoCampanha,
  type Campanha,
  type ContextoDeCupom,
} from "@/lib/campanhas-regras";

const SERVICO = "12345678-1234-4234-8234-123456789abc";
const OUTRO_SERVICO = "12345678-1234-4234-8234-123456789abd";

const campanha: Campanha = {
  nome: "Semana de ofertas",
  codigo: "FLOW20",
  situacao: "ativa",
  inicioEm: "2026-11-10T12:00:00.000Z",
  fimEm: "2026-11-15T12:00:00.000Z",
  beneficio: { tipo: "percentual", percentual: 20 },
  compraMinimaCentavos: 5000,
  limiteGlobal: 100,
  limitePorCliente: 1,
  servicosIds: [SERVICO],
};

const contexto: ContextoDeCupom = {
  agoraIso: "2026-11-12T14:00:00.000Z",
  valorOriginalCentavos: 7000,
  servicoId: SERVICO,
  clienteIdentificado: true,
  usosTotais: 3,
  usosCliente: 0,
};

describe("Campanhas promocionais — validação e cálculo seguro", () => {
  it("normaliza somente código permitido sem inventar caracteres", () => {
    expect(normalizarCodigoCupom(" flow20 ")).toBe("FLOW20");
    expect(normalizarCodigoCupom("FL-12")).toBe("FL-12");
    expect(normalizarCodigoCupom("um código")).toBeNull();
    expect(normalizarCodigoCupom("ABC")).toBeNull();
    expect(normalizarCodigoCupom("☂SALE")).toBeNull();
    expect(normalizarCodigoCupom("AB".repeat(11))).toBeNull();
  });

  it("calcula percentual de valores em centavos e nunca muda valor original", () => {
    const resultado = avaliarCupom(campanha, "flow20", contexto);
    expect(resultado).toEqual({ aplicavel: true, descontoCentavos: 1400, motivo: null });
    expect(contexto.valorOriginalCentavos).toBe(7000);
  });

  it("limita desconto fixo ao valor original e não deixa valor negativo", () => {
    const resultado = avaliarCupom({
      ...campanha, compraMinimaCentavos: 0,
      beneficio: { tipo: "valor_fixo", valorCentavos: 9000 },
    }, "FLOW20", { ...contexto, valorOriginalCentavos: 1500 });
    expect(resultado).toMatchObject({ aplicavel: true, descontoCentavos: 1500 });
  });

  it("recusa campo monetário inválido e desconto percentual fora de faixa", () => {
    expect(validarConfiguracaoCampanha({
      ...campanha, beneficio: { tipo: "percentual", percentual: 101 },
    })).toContain("beneficio");
    expect(validarConfiguracaoCampanha({
      ...campanha, beneficio: { tipo: "valor_fixo", valorCentavos: -1 },
    })).toContain("beneficio");
    expect(avaliarCupom(campanha, "FLOW20", {
      ...contexto, valorOriginalCentavos: Number.NaN,
    })).toMatchObject({ aplicavel: false, motivo: "valor_invalido" });
  });

  it("usa início inclusivo e fim exclusivo sem depender do fuso do aparelho", () => {
    expect(estadoDaCampanha(campanha, "2026-11-10T11:59:59.000Z")).toBe("programada");
    expect(estadoDaCampanha(campanha, campanha.inicioEm)).toBe("ativa");
    expect(estadoDaCampanha(campanha, campanha.fimEm)).toBe("encerrada");
    expect(avaliarCupom(campanha, "FLOW20", {
      ...contexto, agoraIso: campanha.fimEm,
    })).toMatchObject({ aplicavel: false, motivo: "fora_do_prazo" });
  });

  it("não permite cupom pausado ou arquivado", () => {
    expect(avaliarCupom({ ...campanha, situacao: "pausada" }, "FLOW20", contexto))
      .toMatchObject({ aplicavel: false, motivo: "pausada" });
    expect(avaliarCupom({ ...campanha, situacao: "arquivada" }, "FLOW20", contexto))
      .toMatchObject({ aplicavel: false, motivo: "arquivada" });
  });

  it("bloqueia teto global, por cliente e uso sem identificação", () => {
    expect(avaliarCupom(campanha, "FLOW20", {
      ...contexto, usosTotais: 100,
    })).toMatchObject({ aplicavel: false, motivo: "limite_geral" });
    expect(avaliarCupom(campanha, "FLOW20", {
      ...contexto, usosCliente: 1,
    })).toMatchObject({ aplicavel: false, motivo: "limite_cliente" });
    expect(avaliarCupom(campanha, "FLOW20", {
      ...contexto, clienteIdentificado: false,
    })).toMatchObject({ aplicavel: false, motivo: "cliente_necessario" });
  });

  it("aplica restrição de serviço e compra mínima", () => {
    expect(avaliarCupom(campanha, "FLOW20", {
      ...contexto, servicoId: OUTRO_SERVICO,
    })).toMatchObject({ aplicavel: false, motivo: "servico_nao_elegivel" });
    expect(avaliarCupom(campanha, "FLOW20", {
      ...contexto, valorOriginalCentavos: 4999,
    })).toMatchObject({ aplicavel: false, motivo: "compra_minima" });
  });

  it("recusa código errado e configuração corrompida", () => {
    expect(avaliarCupom(campanha, "FLOW30", contexto))
      .toMatchObject({ aplicavel: false, motivo: "codigo_invalido" });
    expect(avaliarCupom({ ...campanha, fimEm: campanha.inicioEm }, "FLOW20", contexto))
      .toMatchObject({ aplicavel: false, motivo: "configuracao_invalida" });
    expect(validarConfiguracaoCampanha({
      ...campanha, servicosIds: [SERVICO, SERVICO],
    })).toContain("servicos");
  });

  it("não confunde previsão do cupom com resgate ou confirmação de pagamento", () => {
    const resultado = avaliarCupom(campanha, "FLOW20", contexto);
    expect(resultado).not.toHaveProperty("resgatado");
    expect(resultado).not.toHaveProperty("pagamentoConfirmado");
    expect(resultado).not.toHaveProperty("saldo");
    expect(resultado).not.toHaveProperty("idDeResgate");
  });
});
