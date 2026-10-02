import { describe, expect, it } from "vitest";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { dadosDoCockpit, situacaoDoLembrete } from "./cockpit-foco";

const item = (id: string, inicio: string, status = "agendado"): AgendaItem => ({
  id, inicio, fim: new Date(+new Date(inicio) + 45 * 60_000).toISOString(), status,
  forma_pagamento: null, valor_centavos: 0, clienteId: id, cliente: `Cliente ${id}`,
  telefone: null, ficha: null, servico: "Serviço", duracaoMin: 45, profissional: "Alex",
  profissionalId: "alex", arrivedAt: null, startedAt: null, finishedAt: null,
});
const AGORA = +new Date("2026-10-02T13:18:00Z");

describe("dadosDoCockpit", () => {
  it("ordena próximos e não inclui o atual em pela frente", () => {
    const atual = { ...item("atual", "2026-10-02T13:00:00Z", "na_cadeira"), startedAt: "2026-10-02T13:00:00Z" };
    const dados = dadosDoCockpit([item("dois", "2026-10-02T15:00:00Z"), atual, item("um", "2026-10-02T14:00:00Z")], AGORA, "America/Sao_Paulo");
    expect(dados.proximo?.id).toBe("um");
    expect(dados.depois[0]?.id).toBe("dois");
    expect(dados.pelaFrente).toBe(2);
  });

  it("mostra tempo restante e excedido", () => {
    const atual = { ...item("atual", "2026-10-02T13:00:00Z", "na_cadeira"), startedAt: "2026-10-02T13:00:00Z" };
    expect(dadosDoCockpit([atual], AGORA, "UTC").restante).toBe(27);
    const excedido = dadosDoCockpit([atual], +new Date("2026-10-02T13:52:00Z"), "UTC");
    expect(excedido.estado).toBe("passou_do_tempo");
    expect(excedido.excedido).toContain("+7 min");
  });

  it.each([["agendado", "proximo"], ["chegou", "chegou"], ["na_cadeira", "na_cadeira"]])("mapeia %s para %s", (status, esperado) => {
    expect(dadosDoCockpit([item("x", "2026-10-02T14:00:00Z", status)], AGORA, "UTC").estado).toBe(esperado);
  });

  it("trata confirmado como atraso depois da tolerância", () => {
    expect(dadosDoCockpit([item("x", "2026-10-02T13:00:00Z", "confirmado")], AGORA, "UTC").estado).toBe("atrasado");
  });

  it("expõe confirmação do lembrete", () => {
    expect(situacaoDoLembrete({ ...item("x", "2026-10-02T14:00:00Z"), confirmadoEm: "2026-10-02T12:00:00Z" })).toBe("Confirmou pelo WhatsApp");
  });
});