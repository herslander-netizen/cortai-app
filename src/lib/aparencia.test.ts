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
    aplicarIdentidade("copper");
    expect(document.documentElement.dataset["identidade"]).toBe("copper");
    expect(window.localStorage.getItem(IDENTIDADE_KEY)).toBe("copper");
  });

  it("o antigo nome cloud vira o Cobre", () => {
    expect(identidadeValida("cloud")).toBe("copper");
    expect(identidadeValida("inexistente")).toBe("moderno");
  });

  it("o script inicial aceita exatamente os temas existentes", () => {
    const raiz = readFileSync(resolve(__dirname, "../routes/__root.tsx"), "utf8");
    const lista = raiz.match(/\^\(([a-z|]+)\)\$/)?.[1]?.split("|");
    expect(lista).toEqual([...IDENTIDADES]);
  });
});
