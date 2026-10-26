import { describe, expect, it } from "vitest";

import { fantasmaDoHorario, formaDoFantasma } from "./fantasma-do-horario";

const f = (inicio: number, fim: number) => ({ inicio, fim });

describe("fantasmaDoHorario", () => {
  it("sem mudança, não há fantasma", () => {
    expect(fantasmaDoHorario(f(60, 90), f(60, 90))).toBeNull();
  });

  it("encurtar mostra o horário original inteiro", () => {
    expect(fantasmaDoHorario(f(60, 90), f(60, 75))).toEqual(f(60, 90));
  });

  it("esticar também mostra o horário original (dono, 26/10)", () => {
    expect(fantasmaDoHorario(f(60, 90), f(60, 120))).toEqual(f(60, 90));
  });

  it("mover mostra onde o cartão estava", () => {
    expect(fantasmaDoHorario(f(60, 90), f(120, 150))).toEqual(f(60, 90));
  });

  it("original vazio não gera fantasma", () => {
    expect(fantasmaDoHorario(f(60, 60), f(60, 90))).toBeNull();
  });
});

describe("formaDoFantasma", () => {
  it("encurtar = encolheu", () => {
    expect(formaDoFantasma(f(60, 90), f(60, 75))).toBe("encolheu");
  });
  it("esticar = cresceu (o pedaço novo fica a 50%)", () => {
    expect(formaDoFantasma(f(60, 90), f(60, 120))).toBe("cresceu");
    expect(formaDoFantasma(f(60, 90), f(45, 90))).toBe("cresceu");
  });
  it("mudar de lugar = moveu", () => {
    expect(formaDoFantasma(f(60, 90), f(75, 105))).toBe("moveu");
    expect(formaDoFantasma(f(60, 90), f(120, 150))).toBe("moveu");
  });
});
