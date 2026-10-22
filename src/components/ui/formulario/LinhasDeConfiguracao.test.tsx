// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LinhaDeOpcoes } from "./LinhaDeOpcoes";
import { GrupoDeLinhas, LinhaComInterruptor, LinhaDeConfiguracao } from "./LinhasDeConfiguracao";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  document.body.innerHTML = "";
});
function montar(el: React.ReactElement) {
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
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  act(() => raiz.render(el));
  return alvo;
}

describe("linhas de configuração (padrão Figaro)", () => {
  it("o grupo tem cantos externos de 28 e internos de 4, com 2 px entre linhas", () => {
    const alvo = montar(
      createElement(GrupoDeLinhas, null, [
        createElement(LinhaDeConfiguracao, { key: "a", titulo: "A" }),
        createElement(LinhaDeConfiguracao, { key: "b", titulo: "B" }),
      ]),
    );
    const classe = alvo.querySelector("ul")!.className;
    expect(classe).toContain("gap-0.5");
    expect(classe).toContain("[&>li]:rounded-[4px]");
    expect(classe).toContain("[&>li:first-child]:rounded-t-[28px]");
    expect(classe).toContain("[&>li:last-child]:rounded-b-[28px]");
  });

  it("a linha com interruptor liga e desliga ao tocar", () => {
    const muda = vi.fn();
    const alvo = montar(
      createElement(GrupoDeLinhas, null, [
        createElement(LinhaComInterruptor, {
          key: "i",
          titulo: "Aceitar encaixes",
          marcado: true,
          aoMudar: muda,
        }),
      ]),
    );
    act(() => (alvo.querySelector('button[role="switch"]') as HTMLButtonElement).click());
    expect(muda).toHaveBeenCalledWith(false);
  });

  it("a linha de opções mostra o valor e troca pela folha", () => {
    const escolhe = vi.fn();
    const alvo = montar(
      createElement(GrupoDeLinhas, null, [
        createElement(LinhaDeOpcoes, {
          key: "o",
          titulo: "Intervalo",
          opcoes: [
            { valor: 15, rotulo: "15 min" },
            { valor: 30, rotulo: "30 min" },
          ],
          valor: 30,
          aoEscolher: escolhe,
        }),
      ]),
    );
    expect(alvo.textContent).toContain("30 min");
    act(() => (alvo.querySelector("button") as HTMLButtonElement).click());
    const opcoes = document.querySelectorAll('[role="radio"]');
    expect(opcoes).toHaveLength(2);
    expect(opcoes[1]!.getAttribute("aria-checked")).toBe("true");
    act(() => (opcoes[0] as HTMLButtonElement).click());
    expect(escolhe).toHaveBeenCalledWith(15);
  });
});
