import { describe, expect, it } from "vitest";

import {
  aplicarEdicao,
  arredondarAoPasso,
  motivoDaRecusa,
  passoDoGesto,
} from "./remarcacao-regras";

const fuso = "America/Sao_Paulo";
// 09/10/2026 às 12:00 em São Paulo (UTC-3)
const agora = Date.UTC(2026, 9, 9, 15, 0);
const h = (hh: number, mm = 0) => Date.UTC(2026, 9, 9, hh + 3, mm);
const base = { agora, dia: "2026-10-09", fuso };

describe("motivoDaRecusa", () => {
  it("horário futuro no mesmo dia pode salvar", () => {
    expect(
      motivoDaRecusa({ ...base, inicio: h(14), fim: h(14, 45), inicioOriginal: h(10) }),
    ).toBeNull();
  });
  it("início no passado é recusado quando o início mudou", () => {
    expect(motivoDaRecusa({ ...base, inicio: h(9, 15), fim: h(10), inicioOriginal: h(14) })).toBe(
      "passado",
    );
  });
  it("esticar a duração de quem já começou (início igual) é permitido", () => {
    expect(
      motivoDaRecusa({ ...base, inicio: h(11), fim: h(12, 30), inicioOriginal: h(11) }),
    ).toBeNull();
  });
  it("cruzar a meia-noite manda usar Remarcar", () => {
    expect(
      motivoDaRecusa({ ...base, inicio: h(23, 30), fim: h(24, 30), inicioOriginal: h(20) }),
    ).toBe("outro_dia");
  });
  it("terminar exatamente à meia-noite ainda é o mesmo dia", () => {
    expect(
      motivoDaRecusa({ ...base, inicio: h(23), fim: h(24), inicioOriginal: h(20) }),
    ).toBeNull();
  });
  it("duração curta demais ou longa demais é recusada", () => {
    expect(motivoDaRecusa({ ...base, inicio: h(14), fim: h(14, 2), inicioOriginal: h(14) })).toBe(
      "duracao",
    );
    expect(motivoDaRecusa({ ...base, inicio: h(14), fim: h(23), inicioOriginal: h(14) })).toBe(
      "duracao",
    );
  });
});

describe("aplicarEdicao e passo", () => {
  it("move o início preservando a duração e depois estica", () => {
    const o = { inicio: "2026-10-09T17:00:00Z", fim: "2026-10-09T17:30:00Z" };
    const r = aplicarEdicao(o, 30, 15);
    expect(new Date(r.inicio).toISOString()).toBe("2026-10-09T17:30:00.000Z");
    expect(new Date(r.fim).toISOString()).toBe("2026-10-09T18:15:00.000Z");
  });
  it("arredonda ao passo do negócio, nunca abaixo de 5 minutos", () => {
    expect(arredondarAoPasso(22, 15)).toBe(15);
    expect(arredondarAoPasso(23, 15)).toBe(30);
    expect(arredondarAoPasso(7, 30)).toBe(0);
    expect(arredondarAoPasso(7, 1)).toBe(5);
  });
});

describe("passoDoGesto", () => {
  it("ajusta sempre de 5 em 5 minutos, como as listras, qualquer que seja o passo do negócio", () => {
    for (const passo of [5, 10, 15, 30, 50, null, 0, Number.NaN])
      expect(passoDoGesto(passo)).toBe(5);
  });
});

describe("limitesDaAlca", () => {
  it("o fim não sobe acima do início mais a duração mínima", async () => {
    const { limitesDaAlca } = await import("./remarcacao-regras");
    // 09:00–09:35 com passo de 5: encolhe no máximo 30 (fica 09:00–09:05), nunca 09:00–08:40.
    expect(limitesDaAlca(540, 575, 5)).toEqual({ min: -30, max: 445 });
    // Passo de 15: só passos inteiros que mantêm 5 min ou mais.
    expect(limitesDaAlca(540, 575, 15).min).toBe(-30);
    expect(limitesDaAlca(540, 545, 5).min).toBe(0);
  });
  it("não passa da meia-noite nem da duração máxima", async () => {
    const { limitesDaAlca } = await import("./remarcacao-regras");
    expect(limitesDaAlca(1380, 1410, 5).max).toBe(30);
    expect(limitesDaAlca(480, 600, 5).max).toBe(360);
  });
});
