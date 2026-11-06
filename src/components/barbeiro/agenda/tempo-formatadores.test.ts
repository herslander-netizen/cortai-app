import { describe, expect, it } from "vitest";

import { diaNoFuso, formatadorDe, hora, minutosNoFuso } from "./tempo";

/** Fluidez da troca de dia: formatadores reaproveitados, com resultado idêntico ao de criar um novo a cada chamada. */
const FUSOS = ["America/Sao_Paulo", "America/Maceio", "America/Manaus", "UTC", undefined] as const;

function instantes(n: number) {
  let semente = 12345;
  const proximo = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
  return Array.from(
    { length: n },
    () => Date.UTC(2026, 0, 1) + Math.floor(proximo() * 365 * 86400_000),
  );
}

describe("formatadores reaproveitados da Agenda", () => {
  it("minutosNoFuso devolve o mesmo que criar o formatador de novo (todos os fusos, o ano inteiro)", () => {
    for (const fuso of FUSOS)
      for (const t of instantes(400)) {
        const partes = new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZone: fuso,
        }).formatToParts(new Date(t));
        const esperado =
          Number(partes.find((p) => p.type === "hour")?.value ?? 0) * 60 +
          Number(partes.find((p) => p.type === "minute")?.value ?? 0);
        expect(minutosNoFuso(t, fuso)).toBe(esperado);
      }
  });

  it("dia no fuso: as opções explícitas e as padrão do en-CA dão o mesmo texto", () => {
    for (const fuso of FUSOS)
      for (const t of instantes(200)) {
        const completo = new Intl.DateTimeFormat("en-CA", {
          timeZone: fuso,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(t));
        expect(diaNoFuso(t, fuso)).toBe(completo);
        expect(
          formatadorDe("en-CA", fuso, { year: "numeric", month: "2-digit", day: "2-digit" }).format(
            new Date(t),
          ),
        ).toBe(completo);
      }
  });

  it("hora() é igual ao toLocaleTimeString de antes", () => {
    for (const fuso of FUSOS)
      for (const t of instantes(200)) {
        const iso = new Date(t).toISOString();
        expect(hora(iso, fuso)).toBe(
          new Date(iso).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: fuso,
          }),
        );
      }
  });

  it("o mesmo formatador é devolvido para a mesma combinação (e outro para outro fuso)", () => {
    const a = formatadorDe("pt-BR", "UTC", { hour: "2-digit" });
    expect(formatadorDe("pt-BR", "UTC", { hour: "2-digit" })).toBe(a);
    expect(formatadorDe("pt-BR", "America/Maceio", { hour: "2-digit" })).not.toBe(a);
  });
});
