import { describe, expect, it } from "vitest";

import { efeitoDaAcaoCard } from "./acao-card";

describe("efeitoDaAcaoCard", () => {
  it.each([
    ["chegou", "marcar_chegada"],
    ["iniciar", "comecar"],
    ["terminar", "abrir_comanda"],
  ] as const)("mapeia %s para %s", (acao, efeito) => {
    expect(efeitoDaAcaoCard(acao)).toBe(efeito);
  });

  it("nunca transforma terminar em mudança de estado", () => {
    expect(efeitoDaAcaoCard("terminar")).not.toBe("marcar_chegada");
    expect(efeitoDaAcaoCard("terminar")).not.toBe("comecar");
  });
});
