import { describe, expect, it } from "vitest";

import { proximasOcorrencias } from "./recorrencia-agendamento";

describe("proximasOcorrencias", () => {
  it("preserva o horário local em séries semanais", () => {
    expect(
      proximasOcorrencias(
        "2026-10-26T12:30:00.000Z",
        "semanal",
        2,
        "America/Maceio",
        new Date("2026-10-01T00:00:00.000Z"),
      ),
    ).toEqual(["2026-11-02T12:30:00.000Z", "2026-11-09T12:30:00.000Z"]);
  });

  it("pula datas que já passaram se o atendimento-base for antigo", () => {
    expect(
      proximasOcorrencias(
        "2026-10-01T12:00:00.000Z",
        "semanal",
        2,
        "America/Maceio",
        new Date("2026-10-22T12:00:00.000Z"),
      ),
    ).toEqual(["2026-10-29T12:00:00.000Z", "2026-11-05T12:00:00.000Z"]);
  });

  it("mantém o dia original em séries mensais quando fevereiro é mais curto", () => {
    expect(
      proximasOcorrencias(
        "2026-01-31T12:00:00.000Z",
        "mensal",
        2,
        "America/Maceio",
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toEqual(["2026-02-28T12:00:00.000Z", "2026-03-31T12:00:00.000Z"]);
  });

  it("recusa quantidades fora da faixa suportada", () => {
    expect(() =>
      proximasOcorrencias(
        "2026-01-01T12:00:00.000Z",
        "semanal",
        0,
        "America/Maceio",
        new Date("2025-12-01T00:00:00.000Z"),
      ),
    ).toThrow("1 a 51");
  });
});
