import { describe, expect, it } from "vitest";
import { calcularPreparoVisual, type AtendimentoParaPreparo } from "./preparo-visual";
const escala = { inicio: 480, fim: 1200 };
const item = (
  id: string, inicio: number, fim: number, status = "agendado", profissionalId = "p1",
): AtendimentoParaPreparo => ({ id, inicio, fim, status, profissionalId });
const preparar = (
  itens: AtendimentoParaPreparo[], intervaloMin: number,
  indisponiveis: { inicio: number; fim: number }[] = [],
) => calcularPreparoVisual({ itens, intervaloMin, escala, indisponiveis });
describe("preparo visual da Agenda", () => {
  it("representa os 20 min de folga já reservados pelo motor", () => {
    expect(preparar([item("a", 600, 630), item("b", 660, 690)], 20)).toEqual([
      { id: "a", inicio: 630, fim: 650, minutos: 20 },
      { id: "b", inicio: 690, fim: 710, minutos: 20 },
    ]);
  });
  it("zero e dados ausentes não inventam reserva", () => {
    expect(preparar([item("a", 600, 630)], 0)).toEqual([]);
    expect(calcularPreparoVisual({
      itens: [item("a", 600, 630)], intervaloMin: undefined, escala,
    })).toEqual([]);
  });
  it("suprime o preparo que coincidiria com encaixe do mesmo profissional", () => {
    expect(preparar([item("a", 600, 630), item("b", 640, 670)], 20)
      .some((p) => p.id === "a")).toBe(false);
  });
  it("respeita bloqueios e pausas do dia", () => {
    expect(preparar([item("a", 690, 720)], 20, [
      { inicio: 720, fim: 780 },
    ])).toEqual([]);
  });
  it("cancelados não criam preparo", () =>
    expect(preparar([item("a", 600, 630, "cancelado")], 20)).toEqual([]));
  it("não conflita com atendimento de outro profissional", () =>
    expect(preparar([
      item("a", 600, 630, "agendado", "p1"),
      item("b", 640, 670, "agendado", "p2"),
    ], 20).some((p) => p.id === "a")).toBe(true));
  it("não ultrapassa o fim da escala", () =>
    expect(calcularPreparoVisual({
      itens: [item("a", 1380, 1430)], intervaloMin: 20,
      escala: { inicio: 0, fim: 1440 },
    })).toEqual([]));
});
