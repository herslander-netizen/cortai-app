import { describe, expect, it } from "vitest";

import { aplicarExcecaoDeIntervalo, horarioDoDia } from "./horarios";
import type { ExcecaoIntervaloAgenda, HorarioDeFuncionamento } from "./horarios";

const horarios: HorarioDeFuncionamento[] = [
  {
    diaSemana: 4,
    fechado: false,
    abre: "09:00",
    fecha: "18:00",
    intervaloInicio: "12:00",
    intervaloFim: "13:00",
  },
];

describe("aplicarExcecaoDeIntervalo", () => {
  const excecao: ExcecaoIntervaloAgenda = {
    dia: "2026-10-01",
    intervaloInicio: "12:30",
    intervaloFim: "13:45",
  };

  it("aplica a exceção apenas à data selecionada e não altera a regra original", () => {
    const doDia = aplicarExcecaoDeIntervalo(horarios, "2026-10-01", excecao);

    expect(horarioDoDia("2026-10-01", doDia)).toMatchObject({
      intervaloInicio: "12:30",
      intervaloFim: "13:45",
    });
    expect(horarioDoDia("2026-10-08", horarios)).toMatchObject({
      intervaloInicio: "12:00",
      intervaloFim: "13:00",
    });
    expect(horarioDoDia("2026-10-01", horarios)).toMatchObject({
      intervaloInicio: "12:00",
      intervaloFim: "13:00",
    });
  });

  it("permite remover o intervalo somente naquele dia, sem apagar o padrão semanal", () => {
    const semIntervalo: ExcecaoIntervaloAgenda = {
      dia: "2026-10-01",
      intervaloInicio: null,
      intervaloFim: null,
    };
    const doDia = aplicarExcecaoDeIntervalo(horarios, "2026-10-01", semIntervalo);

    expect(horarioDoDia("2026-10-01", doDia)).toMatchObject({
      intervaloInicio: null,
      intervaloFim: null,
    });
    expect(horarioDoDia("2026-10-08", horarios)).toMatchObject({
      intervaloInicio: "12:00",
      intervaloFim: "13:00",
    });
  });

  it("ignora uma exceção que pertença a outra data", () => {
    expect(aplicarExcecaoDeIntervalo(horarios, "2026-10-02", excecao)).toBe(horarios);
  });
});
