import { describe, expect, it } from "vitest";

import { podePosicionarAutomaticamente } from "./rolagem-inicial";

describe("rolagem automática da Timeline", () => {
  it("permite uma única ancoragem na primeira abertura em hoje", () => {
    expect(podePosicionarAutomaticamente("2026-11-11", "2026-11-11", null, true, true)).toBe(true);
    expect(podePosicionarAutomaticamente("2026-11-11", "2026-11-11", "2026-11-11", true, true)).toBe(false);
  });

  it("não procura a linha ao deslizar para ontem, amanhã ou voltar a hoje", () => {
    const inicio = "2026-11-11";
    expect(podePosicionarAutomaticamente("2026-11-10", inicio, "2026-11-10", false, true)).toBe(false);
    expect(podePosicionarAutomaticamente("2026-11-12", inicio, "2026-11-12", false, true)).toBe(false);
    expect(podePosicionarAutomaticamente("2026-11-11", inicio, "2026-11-12", true, true)).toBe(false);
    // Mesmo que o RAF da abertura tenha sido cancelado durante um gesto.
    expect(podePosicionarAutomaticamente("2026-11-11", "2026-11-12", null, true, true)).toBe(false);
  });

  it("não inicia rolagem da grade parcial ou da prévia por regra", () => {
    expect(podePosicionarAutomaticamente("2026-11-11", "2026-11-11", null, true, false)).toBe(false);
  });
});
