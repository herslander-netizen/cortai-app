// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

window.matchMedia ??= ((q: string) => ({
  matches: false,
  media: q,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia;

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  document.body.innerHTML = "";
});

async function abrir(props: { side?: "bottom" | "right" | "left"; arrastar?: boolean } = {}) {
  const aoMudar = vi.fn();
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  await act(async () => {
    raiz.render(
      createElement(
        Sheet,
        { open: true, onOpenChange: aoMudar },
        createElement(
          SheetContent,
          {
            side: props.side ?? "bottom",
            ...(props.arrastar === undefined ? {} : { arrastarParaFechar: props.arrastar }),
          },
          createElement(SheetTitle, null, "Titulo"),
          createElement(SheetDescription, null, "Descricao"),
          createElement("div", { "data-conteudo": "" }, "Conteúdo"),
        ),
      ),
    );
  });
  const gaveta = document.querySelector<HTMLElement>("[role=dialog]")!;
  return { aoMudar, gaveta };
}

function toque(alvo: Element, tipo: string, x: number, y: number) {
  const e = new Event(tipo, { bubbles: true, cancelable: true });
  const ponto = { clientX: x, clientY: y };
  Object.assign(e, {
    touches: tipo === "touchend" ? [] : [ponto],
    changedTouches: [ponto],
  });
  alvo.dispatchEvent(e);
}

async function arrastar(alvo: Element, de: [number, number], para: [number, number]) {
  await act(async () => {
    toque(alvo, "touchstart", ...de);
    for (let i = 1; i <= 6; i++) {
      toque(
        alvo,
        "touchmove",
        de[0] + ((para[0] - de[0]) * i) / 6,
        de[1] + ((para[1] - de[1]) * i) / 6,
      );
    }
    toque(alvo, "touchend", ...para);
  });
}

describe("barra (alça) da gaveta", () => {
  it("gaveta de baixo tem a barra e mantém o X só para telas grandes", async () => {
    const { gaveta } = await abrir();
    const alca = gaveta.querySelector("[data-alca-gaveta]");
    expect(alca).not.toBeNull();
    expect(alca!.className).toContain("md:hidden");
    const x = [...gaveta.querySelectorAll("button")].find((b) => b !== alca)!;
    expect(x.className).toContain("max-md:hidden");
  });

  it("arrastar a barra para baixo fecha a gaveta", async () => {
    const { gaveta, aoMudar } = await abrir();
    await arrastar(gaveta.querySelector("[data-alca-gaveta]")!, [200, 10], [200, 220]);
    // A gaveta termina de sair (200 ms) e só então fecha.
    await act(async () => void (await new Promise((ok) => setTimeout(ok, 260))));
    expect(aoMudar).toHaveBeenCalledWith(false);
  });

  it("arrastar pelo conteúdo nunca fecha nem move a gaveta", async () => {
    const { gaveta, aoMudar } = await abrir();
    await arrastar(gaveta.querySelector("[data-conteudo]")!, [200, 200], [200, 500]);
    expect(aoMudar).not.toHaveBeenCalled();
    expect(gaveta.style.transform).toBe("");
  });

  it("tocar na barra também fecha (teclado e leitor de tela usam o mesmo botão)", async () => {
    const { gaveta, aoMudar } = await abrir();
    await act(async () => gaveta.querySelector<HTMLElement>("[data-alca-gaveta]")!.click());
    expect(aoMudar).toHaveBeenCalledWith(false);
  });

  it("gaveta lateral sem o gesto ligado não tem barra e mantém o X", async () => {
    const { gaveta } = await abrir({ side: "right" });
    expect(gaveta.querySelector("[data-alca-gaveta]")).toBeNull();
    const x = gaveta.querySelector("button")!;
    expect(x.className).not.toContain("hidden");
  });

  it("gaveta lateral com o gesto ligado ganha a barra vertical na borda", async () => {
    const { gaveta } = await abrir({ side: "left", arrastar: true });
    const alca = gaveta.querySelector("[data-alca-gaveta]")!;
    expect(alca.className).toContain("right-0");
  });
});
