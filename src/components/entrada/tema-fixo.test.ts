import { describe, expect, it } from "vitest";

import { CLASSE_TELA_ENTRADA, TEMA_FIXO_ENTRADA } from "./tema-fixo";

describe("tema fixo da entrada", () => {
  it("mantém a rota clara e no fundo branco independentemente do tema global (dono, 06/11)", () => {
    const classes = CLASSE_TELA_ENTRADA.split(/\s+/);
    expect(classes).toContain("light");
    expect(classes).toContain("auth-screen--claro");
    expect(classes).not.toContain("dark");
    expect(TEMA_FIXO_ENTRADA.colorScheme).toBe("light");
    expect(TEMA_FIXO_ENTRADA.background).toBe("var(--fundo)");
    expect(TEMA_FIXO_ENTRADA["--fundo"]).toBe("#ffffff");
    expect(TEMA_FIXO_ENTRADA["--figaro-background"]).toBe("var(--fundo)");
    expect(TEMA_FIXO_ENTRADA["--figaro-on-surface"]).toBe("var(--texto)");
    // Ondas nas cores da marca: azul, lilás e rosa.
    for (const cor of ["--entrada-ciano", "--entrada-lilas", "--entrada-rosa"]) {
      expect(TEMA_FIXO_ENTRADA[cor], cor).toMatch(/^#/);
    }
  });
});
