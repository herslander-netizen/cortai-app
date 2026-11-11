import { describe, expect, it } from "vitest";

import { minutosNoFuso } from "./tempo";

describe("minutosNoFuso", () => {
  it("mantém o horário local do estabelecimento ao reutilizar o formatador", () => {
    const horario = "2026-11-11T20:15:00.000Z";
    for (let i = 0; i < 20; i++) {
      expect(minutosNoFuso(horario, "America/Sao_Paulo")).toBe(17 * 60 + 15);
    }
  });

  it("não mistura os formatadores de fusos diferentes", () => {
    const instante = Date.parse("2026-11-11T20:15:00.000Z");
    expect(minutosNoFuso(instante, "America/Manaus")).toBe(16 * 60 + 15);
    expect(minutosNoFuso(instante, "America/Bahia")).toBe(17 * 60 + 15);
    expect(minutosNoFuso(instante, "Europe/London")).toBe(20 * 60 + 15);
    expect(minutosNoFuso(instante, "America/Manaus")).toBe(16 * 60 + 15);
  });
});
