// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { IDENTIDADE_KEY, IDENTIDADES, aplicarIdentidade, identidadeValida } from "./aparencia";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset["identidade"];
});

describe("aplicarIdentidade", () => {
  it("aplica o tema no documento e lembra dele neste aparelho", () => {
    aplicarIdentidade("moderno");
    expect(document.documentElement.dataset["identidade"]).toBe("moderno");
    expect(window.localStorage.getItem(IDENTIDADE_KEY)).toBe("moderno");
  });

  it("só existe o tema Padrão; temas antigos salvos caem nele", () => {
    expect([...IDENTIDADES]).toEqual(["moderno"]);
    for (const antigo of ["rose", "indigo", "copper", "classico", "cloud", "inexistente", null]) {
      expect(identidadeValida(antigo)).toBe("moderno");
    }
  });

  it("o script inicial abre sempre no Padrão", () => {
    const raiz = readFileSync(resolve(__dirname, "../routes/__root.tsx"), "utf8");
    expect(raiz).toContain('d.dataset.identidade="moderno";');
    expect(raiz).not.toMatch(/rose\|indigo|copper|classico/);
  });
});
