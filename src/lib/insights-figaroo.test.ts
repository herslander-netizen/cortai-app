import { describe, expect, it } from "vitest";

import {
  calcularDesempenhoInsights,
  calcularPrevisaoInsights,
  type AtendimentoInsights,
} from "@/lib/insights-figaroo";

const agora = "2026-11-12T15:00:00.000Z";
const hoje = "2026-11-12";
const fuso = "America/Maceio";

function agendamento(
  inicio: string,
  status: string,
  valorCentavos: number,
  profissionalId: string | null = "a",
  profissionalNome: string | null = "Ana",
): AtendimentoInsights {
  return { inicio, status, valorCentavos, profissionalId, profissionalNome };
}

describe("Insights Figaroo do Flow", () => {
  it("considera apenas agendamentos válidos e futuros na previsão", () => {
    const itens = [
      agendamento("2026-11-12T16:00:00Z", "agendado", 3000),
      agendamento("2026-11-13T16:00:00Z", "chegou", 4000),
      agendamento("2026-11-14T16:00:00Z", "na_cadeira", 5000),
      agendamento("2026-11-12T13:00:00Z", "agendado", 9000),
      agendamento("2026-11-13T16:00:00Z", "cancelado", 8000),
      agendamento("2026-11-13T16:00:00Z", "nao_compareceu", 1000),
      agendamento("2026-11-19T12:00:00Z", "agendado", 3000),
    ];
    const resultado = calcularPrevisaoInsights(itens, hoje, agora, fuso, 7);
    expect(resultado.valorCentavos).toBe(12_000);
    expect(resultado.agendamentos).toBe(3);
  });

  it("usa o dia civil do fuso do negócio perto da meia-noite", () => {
    const itens = [
      agendamento("2026-11-19T02:30:00Z", "agendado", 7000),
      agendamento("2026-11-19T03:30:00Z", "agendado", 3000),
    ];
    const resultado = calcularPrevisaoInsights(itens, hoje, agora, fuso, 7);
    expect(resultado.valorCentavos).toBe(7000);
    expect(resultado.agendamentos).toBe(1);
  });

  it("nunca mistura vendas recebidas com reservas futuras", () => {
    const resultado = calcularDesempenhoInsights({
      atual: [{ valorCentavos: 10000 }, { valorCentavos: 8000 }],
      anterior: [{ valorCentavos: 9000 }],
      futuros: [agendamento("2026-11-15T16:00:00Z", "agendado", 11000)],
      faltas: [],
      hoje, agoraIso: agora, fuso, horizonte: 30,
    });
    expect(resultado.receitaCentavos).toBe(18000);
    expect(resultado.anteriorCentavos).toBe(9000);
    expect(resultado.variacaoPct).toBe(100);
    expect(resultado.previsaoCentavos).toBe(11000);
  });

  it("ordena por previsão e conta somente faltas reais, isolando o profissional", () => {
    const resultado = calcularDesempenhoInsights({
      atual: [], anterior: [],
      futuros: [
        agendamento("2026-11-15T16:00:00Z", "agendado", 1000, "a", "Ana"),
        agendamento("2026-11-15T16:00:00Z", "agendado", 7000, "b", "Bruno"),
      ],
      faltas: [
        agendamento("2026-11-11T16:00:00Z", "nao_compareceu", 1000, "a", "Ana"),
        agendamento("2026-11-11T16:00:00Z", "finalizado", 1000, "a", "Ana"),
      ],
      hoje, agoraIso: agora, fuso, horizonte: 30,
    });
    expect(resultado.profissionais.map((p) => p.nome)).toEqual(["Bruno", "Ana"]);
    expect(resultado.faltas).toBe(1);
    expect(resultado.profissionais[1]?.faltas).toBe(1);
    expect(resultado.variacaoPct).toBe(0);
  });

  it("não aceita valor negativo ou inválido nos cálculos de receita", () => {
    const resultado = calcularDesempenhoInsights({
      atual: [{ valorCentavos: -100 }, { valorCentavos: Number.NaN }],
      anterior: [],
      futuros: [agendamento("2026-11-15T16:00:00Z", "agendado", -300)],
      faltas: [],
      hoje, agoraIso: agora, fuso, horizonte: 30,
    });
    expect(resultado.receitaCentavos).toBe(0);
    expect(resultado.previsaoCentavos).toBe(0);
  });
});
