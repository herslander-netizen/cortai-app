import { describe, expect, it } from "vitest";

import { faixasForaDoExpediente, nomeDaAgenda } from "./tempo";

describe("nomeDaAgenda", () => {
  it("abrevia sobrenome somente no modo discreto", () => {
    expect(nomeDaAgenda("Herslander Jorge dos Santos", true)).toBe("Herslander J.");
    expect(nomeDaAgenda("Herslander Jorge dos Santos", false)).toBe("Herslander Jorge dos Santos");
  });

  it("mantém nome genérico e nome de uma palavra", () => {
    expect(nomeDaAgenda("Cliente avulso", true)).toBe("Cliente avulso");
    expect(nomeDaAgenda("Madonna", true)).toBe("Madonna");
  });
});

describe("faixasForaDoExpediente", () => {
  const dia = "2026-10-02";
  const horario = {
    diaSemana: 5,
    fechado: false,
    abre: "09:00",
    fecha: "18:00",
    intervaloInicio: null,
    intervaloFim: null,
  };

  it("marca antes da abertura e depois do fechamento", () => {
    expect(faixasForaDoExpediente([horario], dia, { inicio: 8 * 60, fim: 19 * 60 })).toEqual([
      { inicio: 8 * 60, fim: 9 * 60 },
      { inicio: 18 * 60, fim: 19 * 60 },
    ]);
  });

  it("não marca quando a escala está dentro do expediente", () => {
    expect(faixasForaDoExpediente([horario], dia, { inicio: 10 * 60, fim: 17 * 60 })).toEqual([]);
  });

  it("marca a escala inteira quando o dia está fechado", () => {
    expect(
      faixasForaDoExpediente([{ ...horario, fechado: true }], dia, {
        inicio: 8 * 60,
        fim: 19 * 60,
      }),
    ).toEqual([{ inicio: 8 * 60, fim: 19 * 60, fechado: true }]);
  });

  it("não marca quando não há horários cadastrados", () => {
    expect(faixasForaDoExpediente([], dia, { inicio: 8 * 60, fim: 19 * 60 })).toEqual([]);
  });
});
