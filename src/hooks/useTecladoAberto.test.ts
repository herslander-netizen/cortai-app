import { describe, expect, it } from "vitest";

import { tecladoEstaAberto } from "./useTecladoAberto";

describe("teclado aberto (botões da Agenda não sobem com ele)", () => {
  it("só conta com campo em foco e a tela bem menor que a maior já vista", () => {
    expect(tecladoEstaAberto(800, 450, true)).toBe(true);
    expect(tecladoEstaAberto(800, 450, false)).toBe(false);
    // Barra do navegador entrando e saindo mexe pouco na altura: não é teclado.
    expect(tecladoEstaAberto(800, 740, true)).toBe(false);
  });
});
