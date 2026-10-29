import { describe, expect, it } from "vitest";
import { statusDeFuncionamento } from "./status-funcionamento";
import type { HorarioDeFuncionamento } from "./horarios";

const semana: HorarioDeFuncionamento[] = Array.from({ length: 7 }, (_, diaSemana) => ({
  diaSemana,
  fechado: diaSemana === 0,
  abre: "09:00",
  fecha: "19:00",
  intervaloInicio: diaSemana === 1 ? "12:00" : null,
  intervaloFim: diaSemana === 1 ? "13:00" : null,
}));

const emSaoPaulo = (iso: string) =>
  statusDeFuncionamento(semana, "America/Sao_Paulo", new Date(iso));

describe("statusDeFuncionamento", () => {
  it("encontra a próxima abertura em dia fechado", () => {
    expect(emSaoPaulo("2026-10-04T15:00:00Z")?.texto).toBe("Fechado agora · abre amanhã às 09:00");
  });
  it("trata intervalo como fechado temporariamente", () => {
    expect(emSaoPaulo("2026-10-05T15:30:00Z")?.texto).toBe("Fechado agora · abre hoje às 13:00");
  });
  it("considera a mudança de intervalo só na data excepcional", () => {
    const excecoes = [
      {
        dia: "2026-10-05",
        intervaloInicio: "13:00",
        intervaloFim: "14:00",
      },
    ];
    const status = statusDeFuncionamento(
      semana,
      "America/Sao_Paulo",
      new Date("2026-10-05T15:30:00Z"),
      excecoes,
    );
    expect(status?.aberto).toBe(true);
    expect(status?.texto).toBe("Aberto agora · fecha às 13:00");
  });

  it("permite remover o intervalo padrão temporariamente apenas no dia excepcional", () => {
    const excecoes = [
      {
        dia: "2026-10-05",
        intervaloInicio: null,
        intervaloFim: null,
      },
    ];
    const status = statusDeFuncionamento(
      semana,
      "America/Sao_Paulo",
      new Date("2026-10-05T15:30:00Z"),
      excecoes,
    );
    expect(status?.aberto).toBe(true);
    expect(status?.texto).toBe("Aberto agora · fecha às 19:00");
  });

  it("mantém aberto após meia-noite quando o expediente começou no dia anterior", () => {
    const horarios = [{ diaSemana: 5, fechado: false, abre: "20:00", fecha: "02:00" }];
    expect(
      statusDeFuncionamento(horarios, "America/Sao_Paulo", new Date("2026-10-03T04:00:00Z"))
        ?.aberto,
    ).toBe(true);
  });
  it("não inventa status sem horários", () => {
    expect(statusDeFuncionamento([], "America/Sao_Paulo")).toBeNull();
  });
});
