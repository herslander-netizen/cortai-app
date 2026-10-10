// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { FAMILIAS_DE_TEMA } from "@/lib/familias-tema";
import { configPadrao } from "@/lib/pagina-config";

import { SecaoTema } from "./SecaoTema";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("SecaoTema", () => {
  it("mostra uma miniatura pintada com as cores de cada família e escolhe ao tocar", async () => {
    const escolher = vi.fn();
    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    await act(async () =>
      createRoot(alvo).render(
        createElement(SecaoTema, { config: configPadrao(), segmento: "barbearia", escolher }),
      ),
    );
    const grupo = alvo.querySelector('[aria-label="Tema"]')!;
    const cartoes = grupo.querySelectorAll("button");
    expect(cartoes).toHaveLength(FAMILIAS_DE_TEMA.length);
    cartoes.forEach((c) => expect(c.querySelector("span[aria-hidden] i")).not.toBeNull());
    await act(async () => (cartoes[0] as HTMLElement).click());
    expect(escolher).toHaveBeenCalledTimes(1);
  });
});
