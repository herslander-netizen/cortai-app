import { describe, expect, it } from "vitest";

import { coresDoRaizes, horariosAgrupados, linkDoMapa, luminancia, primeiroNome } from "./raizes";

const h = (dia_semana: number, abre = "09:00:00", fecha = "20:00:00", fechado = false) => ({
  dia_semana,
  fechado,
  abre,
  fecha,
});

describe("layout Raízes", () => {
  it("agrupa os dias com o mesmo horário e põe o fechado no fim", () => {
    const horarios = [
      h(0, "00:00:00", "00:00:00", true),
      h(1, "00:00:00", "00:00:00", true),
      ...[2, 3, 4, 5, 6].map((d) => h(d)),
    ];
    expect(horariosAgrupados(horarios)).toEqual([
      { dias: "Terça a sábado", horario: "9h – 20h" },
      { dias: "Domingo e segunda", horario: "Fechado" },
    ]);
  });

  it("mostra minutos só quando existem", () => {
    expect(horariosAgrupados([h(1, "08:30:00", "18:00:00")])[0]?.horario).toBe("8h30 – 18h");
  });

  it("escolhe escuro e claro pelo brilho, em tema escuro e em tema claro", () => {
    const escuro = coresDoRaizes({
      principal: "#FF5A1F",
      secundaria: "#1A1A1A",
      botao: "#FF5A1F",
      fundo: "#0B0B0B",
      texto: "#F2F2F0",
      destaque: "#FF5A1F",
    });
    expect(escuro).toEqual({ escuro: "#0B0B0B", claro: "#F2F2F0", acento: "#FF5A1F" });
    const claro = coresDoRaizes({
      principal: "#222222",
      secundaria: "#EEEEEE",
      botao: "#222222",
      fundo: "#FAF7F2",
      texto: "#1B1B1B",
      destaque: "#222222",
    });
    expect(claro.escuro).toBe("#1B1B1B");
    expect(claro.claro).toBe("#FAF7F2");
    expect(luminancia("#FFFFFF")).toBeGreaterThan(luminancia("#000000"));
  });

  it("usa o primeiro nome e um link de mapa codificado", () => {
    expect(primeiroNome("  Rafael  Souza ")).toBe("Rafael");
    expect(linkDoMapa("Rua A, 10 - Centro")).toContain("Rua%20A%2C%2010%20-%20Centro");
  });
});
