import { describe, expect, it } from "vitest";

import { intervaloDoPeriodo } from "./historico-periodo";

const FUSO = "America/Sao_Paulo";
// Quarta-feira, 21/10/2026.
const HOJE = "2026-10-21";

describe("intervaloDoPeriodo", () => {
  it("hoje cobre o dia inteiro no fuso do negócio", () => {
    expect(intervaloDoPeriodo("hoje", HOJE, FUSO)).toEqual({
      inicio: "2026-10-21T03:00:00.000Z",
      fim: "2026-10-22T03:00:00.000Z",
    });
  });
  it("a semana começa na segunda", () => {
    expect(intervaloDoPeriodo("semana", HOJE, FUSO)).toEqual({
      inicio: "2026-10-19T03:00:00.000Z",
      fim: "2026-10-26T03:00:00.000Z",
    });
  });
  it("mês e ano vão do primeiro dia ao primeiro do seguinte", () => {
    expect(intervaloDoPeriodo("mes", HOJE, FUSO)).toEqual({
      inicio: "2026-10-01T03:00:00.000Z",
      fim: "2026-11-01T03:00:00.000Z",
    });
    expect(intervaloDoPeriodo("ano", HOJE, FUSO)).toEqual({
      inicio: "2026-01-01T03:00:00.000Z",
      fim: "2027-01-01T03:00:00.000Z",
    });
  });
  it("últimos e próximos dias incluem hoje", () => {
    expect(intervaloDoPeriodo("ultimos7", HOJE, FUSO)?.inicio).toBe("2026-10-15T03:00:00.000Z");
    expect(intervaloDoPeriodo("proximos30", HOJE, FUSO)?.fim).toBe("2026-11-20T03:00:00.000Z");
  });
  it("todo o período e futuros ficam abertos numa ponta", () => {
    expect(intervaloDoPeriodo("tudo", HOJE, FUSO)).toEqual({ inicio: null, fim: null });
    expect(intervaloDoPeriodo("futuros", HOJE, FUSO)?.fim).toBeNull();
  });
  it("personalizado aceita até 1 ano e recusa datas inválidas", () => {
    expect(intervaloDoPeriodo("personalizado", HOJE, FUSO, "2026-10-01", "2026-10-02")).toEqual({
      inicio: "2026-10-01T03:00:00.000Z",
      fim: "2026-10-03T03:00:00.000Z",
    });
    expect(intervaloDoPeriodo("personalizado", HOJE, FUSO, "2025-10-01", "2026-10-02")).toBeNull();
    expect(intervaloDoPeriodo("personalizado", HOJE, FUSO, "2026-10-05", "2026-10-01")).toBeNull();
    expect(intervaloDoPeriodo("personalizado", HOJE, FUSO)).toBeNull();
  });
});
