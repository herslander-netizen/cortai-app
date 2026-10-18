import { describe, expect, it } from "vitest";

import { expedienteDoProfissional } from "./expediente";

// 2026-10-19 é segunda-feira (dia da semana 1); 2026-10-18, domingo (0).
const horarios = [
  { diaSemana: 0, fechado: true, abre: "00:00", fecha: "00:00" },
  { diaSemana: 1, fechado: false, abre: "09:00", fecha: "18:00" },
];

describe("expedienteDoProfissional", () => {
  it("sem escala, vale o horário do negócio", () => {
    expect(expedienteDoProfissional("2026-10-19", "p1", horarios, [])).toEqual({
      trabalha: true,
      abre: "09:00",
      fecha: "18:00",
    });
  });

  it("negócio fechado no dia: ninguém trabalha", () => {
    expect(expedienteDoProfissional("2026-10-18", "p1", horarios, [])).toEqual({
      trabalha: false,
    });
  });

  it("a escala do profissional manda no dia dela", () => {
    const escalas = [
      { profissional_id: "p1", dia_semana: 1, trabalha: true, abre: "10:00:00", fecha: "16:30:00" },
      { profissional_id: "p2", dia_semana: 1, trabalha: false, abre: null, fecha: null },
    ];
    expect(expedienteDoProfissional("2026-10-19", "p1", horarios, escalas)).toEqual({
      trabalha: true,
      abre: "10:00",
      fecha: "16:30",
    });
    expect(expedienteDoProfissional("2026-10-19", "p2", horarios, escalas)).toEqual({
      trabalha: false,
    });
    expect(expedienteDoProfissional("2026-10-19", "p3", horarios, escalas)).toEqual({
      trabalha: true,
      abre: "09:00",
      fecha: "18:00",
    });
  });
});
