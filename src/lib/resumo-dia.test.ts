import { describe, expect, it } from "vitest";
import { resumoDoDia } from "./resumo-dia";

const base = { startedAt: null, finishedAt: null, inicio: "2026-10-01T12:00:00Z" };
describe("resumo do dia", () => {
  it("soma faturado, previsto e tempo médio", () => {
    const r = resumoDoDia(
      [
        {
          ...base,
          status: "finalizado",
          valor_centavos: 4000,
          startedAt: "2026-10-01T10:00:00Z",
          finishedAt: "2026-10-01T10:30:00Z",
        },
        { ...base, status: "agendado", valor_centavos: 3000 },
        { ...base, status: "cancelado", valor_centavos: 9999 },
      ],
      new Date("2026-10-01T11:00:00Z").getTime(),
    );
    expect(r).toMatchObject({
      feitos: 1,
      restantes: 1,
      faturado: 4000,
      previsto: 7000,
      tempoMedio: 30,
      atrasados: 0,
    });
  });
  it("marca atraso após 10 minutos", () => {
    expect(
      resumoDoDia(
        [{ ...base, status: "agendado", valor_centavos: 0 }],
        new Date("2026-10-01T12:11:00Z").getTime(),
      ).atrasados,
    ).toBe(1);
  });
});
