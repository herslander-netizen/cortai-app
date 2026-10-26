import { describe, expect, it } from "vitest";

import { lerHorario, valorNoMostrador } from "./seletor-de-horario";

// Mostrador de 256: centro 128; anel de fora a 104, de dentro a 70.
describe("relógio de escolher horário", () => {
  it("anel de fora são 00–11 e o de dentro 12–23", () => {
    expect(valorNoMostrador("hora", 128, 24)).toBe(0);
    expect(valorNoMostrador("hora", 232, 128)).toBe(3);
    expect(valorNoMostrador("hora", 128, 58)).toBe(12);
    expect(valorNoMostrador("hora", 128, 198)).toBe(18);
  });
  it("minutos de 5 em 5", () => {
    expect(valorNoMostrador("minuto", 232, 128)).toBe(15);
    expect(valorNoMostrador("minuto", 128, 232)).toBe(30);
    expect(valorNoMostrador("minuto", 24, 128)).toBe(45);
  });
  it("lê HH:MM e cai em 09:00 se vier vazio", () => {
    expect(lerHorario("07:30")).toEqual({ h: 7, m: 30 });
    expect(lerHorario("")).toEqual({ h: 9, m: 0 });
  });
});
