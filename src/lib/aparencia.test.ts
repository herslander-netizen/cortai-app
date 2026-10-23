// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { IDENTIDADE_KEY, IDENTIDADES, aplicarIdentidade } from "./aparencia";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset["identidade"];
});

describe("aplicarIdentidade", () => {
  it("aplica o tema no documento e lembra dele neste aparelho", () => {
    aplicarIdentidade("cloud");
    expect(document.documentElement.dataset["identidade"]).toBe("cloud");
    expect(window.localStorage.getItem(IDENTIDADE_KEY)).toBe("cloud");
  });

  it("o script inicial aceita exatamente os temas existentes", () => {
    const raiz = readFileSync(resolve(__dirname, "../routes/__root.tsx"), "utf8");
    const lista = raiz.match(/\^\(([a-z|]+)\)\$/)?.[1]?.split("|");
    expect(lista).toEqual([...IDENTIDADES]);
  });
});
