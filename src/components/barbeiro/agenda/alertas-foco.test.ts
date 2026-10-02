import { describe, expect, it } from "vitest";
import { alertasDeEmergencia } from "./alertas-foco";
import type { AgendaItem } from "@/lib/barbeiro.functions";

const item = (id: string, inicio: string, status = "agendado"): AgendaItem => ({ id, inicio, fim: new Date(+new Date(inicio) + 30 * 60_000).toISOString(), status, forma_pagamento: null, valor_centavos: 0, clienteId: id, cliente: `Cliente ${id}`, telefone: null, ficha: null, servico: "Serviço", duracaoMin: 30, profissional: "Profissional", arrivedAt: null, startedAt: null, finishedAt: null });

describe("alertasDeEmergencia", () => {
  it("prioriza conexão e limita a dois", () => {
    const anterior = [item("1", "2026-10-02T13:00:00Z"), item("2", "2026-10-02T13:30:00Z")];
    const atual = [{ ...anterior[0], status: "cancelado" }, { ...anterior[1], status: "chegou", arrivedAt: "2026-10-02T13:20:00Z" }];
    expect(alertasDeEmergencia({ itens: atual, itensAnteriores: anterior, agora: +new Date("2026-10-02T13:40:00Z"), online: false }).map((a) => a.tipo)).toEqual(["sem_internet", "proximo_mudou"]);
  });
  it("não alerta mudança além do próximo e respeita Entendi", () => {
    const anterior = [item("1", "2026-10-02T13:00:00Z"), item("2", "2026-10-02T13:30:00Z"), item("3", "2026-10-02T14:00:00Z")];
    const distante = anterior.map((i) => i.id === "3" ? { ...i, status: "cancelado" } : i);
    expect(alertasDeEmergencia({ itens: distante, itensAnteriores: anterior, agora: Date.now(), online: true })).toEqual([]);
    const atual = anterior.map((i) => i.id === "1" ? { ...i, status: "cancelado" } : i);
    const alerta = alertasDeEmergencia({ itens: atual, itensAnteriores: anterior, agora: Date.now(), online: true })[0];
    expect(alerta?.tipo).toBe("proximo_mudou");
    expect(alertasDeEmergencia({ itens: atual, itensAnteriores: anterior, agora: Date.now(), online: true, dispensados: new Set([alerta?.id ?? ""]) })).toEqual([]);
  });
  it("avisa atraso do próximo após cinco minutos", () => {
    const atual = [item("1", "2026-10-02T13:00:00Z", "na_cadeira"), { ...item("2", "2026-10-02T13:30:00Z", "chegou"), arrivedAt: "2026-10-02T13:30:00Z" }];
    expect(alertasDeEmergencia({ itens: atual, itensAnteriores: atual, agora: +new Date("2026-10-02T13:36:00Z"), online: true })[0]?.texto).toContain("aguarda há 6 min");
  });
});