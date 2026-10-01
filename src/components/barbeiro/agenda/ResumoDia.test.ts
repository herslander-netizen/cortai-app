import { describe, expect, it } from "vitest";

import type { AgendaItem } from "@/lib/barbeiro.functions";

import { disponibilidadeHoje } from "./ResumoDia";

const horarios = [{ diaSemana: 4, fechado: false, abre: "08:00", fecha: "18:00" }];
const agora = Date.parse("2026-10-01T15:00:00Z");

function item(extra: Partial<AgendaItem>): AgendaItem {
  return {
    id: "a1",
    inicio: "2026-10-01T16:00:00Z",
    fim: "2026-10-01T16:30:00Z",
    status: "agendado",
    forma_pagamento: null,
    valor_centavos: 0,
    clienteId: null,
    cliente: "Ana",
    telefone: null,
    ficha: null,
    servico: "Corte",
    duracaoMin: 30,
    profissional: "Bia",
    profissionalId: "p1",
    arrivedAt: null,
    startedAt: null,
    finishedAt: null,
    ...extra,
  };
}

describe("disponibilidadeHoje", () => {
  it("mostra livre até o próximo horário para um profissional", () => {
    expect(
      disponibilidadeHoje({
        itens: [item({})],
        horarios,
        dia: "2026-10-01",
        fuso: "UTC",
        profissionalIds: ["p1"],
        agora,
      }),
    ).toBe("livre até 16:00");
  });

  it("conta profissionais livres agora na visão Todos", () => {
    expect(
      disponibilidadeHoje({
        itens: [item({ inicio: "2026-10-01T14:30:00Z", fim: "2026-10-01T15:30:00Z" })],
        horarios,
        dia: "2026-10-01",
        fuso: "UTC",
        profissionalIds: ["p1", "p2"],
        agora,
      }),
    ).toBe("1 livres agora");
  });
});
