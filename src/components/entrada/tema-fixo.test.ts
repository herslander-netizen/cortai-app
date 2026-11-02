import { describe, expect, it } from "vitest";

import { CLASSE_TELA_ENTRADA, TEMA_FIXO_ENTRADA } from "./tema-fixo";

describe("tema fixo da entrada", () => {
  it("mantém a rota em dark e no fundo grafite independentemente do tema global", () => {
    expect(CLASSE_TELA_ENTRADA.split(/\s+/)).toContain("dark");
    expect(TEMA_FIXO_ENTRADA.colorScheme).toBe("dark");
    expect(TEMA_FIXO_ENTRADA.background).toBe("var(--fundo)");
    expect(TEMA_FIXO_ENTRADA["--fundo"]).toBe("#090a12");
    expect(TEMA_FIXO_ENTRADA["--figaro-background"]).toBe("var(--fundo)");
    expect(TEMA_FIXO_ENTRADA["--figaro-on-surface"]).toBe("var(--texto)");
    expect(TEMA_FIXO_ENTRADA["--figaro-primary"]).toBe("#766cff");
    expect(TEMA_FIXO_ENTRADA["--figaro-tertiary"]).toBe("#f05aa9");
  });
});
