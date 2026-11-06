// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGestoDia } from "./useGestoDia";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * Fluidez da troca de dia (06/11/2026): `--dia-progresso` (a bolinha da semana seguindo o dedo) só pode ser escrita na
 * faixa da semana. Na raiz do documento, cada quadro revalidava o estilo da página inteira (33 ms por quadro a 6× mais
 * lento, contra 0,3 ms só na faixa).
 */
function Palco({ aoTrocar }: { aoTrocar: (d: string) => void }) {
  const { ref } = useGestoDia("2099-10-09", aoTrocar);
  return createElement("div", { id: "palco", ref, style: { width: 400, height: 400 } });
}

function toque(tipo: string, x: number, y: number, alvo: Element) {
  const e = new Event(tipo, { bubbles: true, cancelable: true });
  Object.assign(e, { touches: tipo === "touchend" ? [] : [{ clientX: x, clientY: y }] });
  alvo.dispatchEvent(e);
}

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  document.body.replaceChildren();
  document.documentElement.style.removeProperty("--dia-progresso");
});

describe("progresso do dia no deslize", () => {
  it("escreve só na faixa da semana, nunca na raiz do documento, e limpa ao soltar", () => {
    window.matchMedia ??= ((q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => {
      f(0);
      return 1;
    });
    const semana = document.createElement("div");
    semana.setAttribute("data-semana-do-dia", "");
    document.body.appendChild(semana);
    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const raiz = createRoot(alvo);
    limpar.push(() => act(() => raiz.unmount()));
    act(() => raiz.render(createElement(Palco, { aoTrocar: () => {} })));
    const palco = document.getElementById("palco")!;

    act(() => {
      toque("touchstart", 200, 200, palco);
      toque("touchmove", 160, 202, palco);
      toque("touchmove", 100, 204, palco);
    });
    const naFaixa = semana.style.getPropertyValue("--dia-progresso");
    expect(naFaixa).not.toBe("");
    expect(Number(naFaixa)).toBeGreaterThan(0); // dedo para a esquerda: o próximo dia chega
    expect(document.documentElement.style.getPropertyValue("--dia-progresso")).toBe("");

    act(() => {
      toque("touchend", 100, 204, palco);
    });
    vi.unstubAllGlobals();
  });
});
