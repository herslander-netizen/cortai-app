// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useArrastarParaFechar } from "./useArrastarParaFechar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
  document.body.innerHTML = "";
});

function Gaveta({ qualquerPonto, onFechar }: { qualquerPonto: boolean; onFechar: () => void }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useArrastarParaFechar(el, "left", true, qualquerPonto);
  return createElement(
    "div",
    null,
    createElement("div", { "data-state": "open", id: "fundo" }),
    createElement(
      "div",
      { ref: setEl, role: "dialog", id: "gaveta" },
      createElement("button", { "data-fechar-gaveta": "", onClick: onFechar }, "Fechar"),
      createElement("a", { id: "item" }, "Serviços"),
    ),
  );
}

function montar(qualquerPonto: boolean) {
  const fechou = vi.fn();
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  act(() => raiz.render(createElement(Gaveta, { qualquerPonto, onFechar: fechou })));
  const gaveta = document.getElementById("gaveta")!;
  Object.defineProperty(gaveta, "offsetWidth", { value: 300 });
  return {
    fechou,
    gaveta,
    item: document.getElementById("item")!,
    fundo: document.getElementById("fundo")!,
  };
}

function toque(alvo: Element, tipo: string, x: number, y: number, tempo: number) {
  const ev = new Event(tipo, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "touches", {
    value: tipo === "touchend" ? [] : [{ clientX: x, clientY: y }],
  });
  Object.defineProperty(ev, "timeStamp", { value: tempo });
  alvo.dispatchEvent(ev);
}

function arrastar(alvo: Element, dx: number, dy: number) {
  toque(alvo, "touchstart", 200, 300, 0);
  for (let i = 1; i <= 10; i++)
    toque(alvo, "touchmove", 200 + (dx * i) / 10, 300 + (dy * i) / 10, i * 30);
  toque(alvo, "touchend", 0, 0, 330);
}

describe("menu lateral: arrastar em qualquer ponto para fechar (como o Figaro)", () => {
  it("arrastar um item para a esquerda fecha a gaveta e o fundo clareia junto", () => {
    const { fechou, item, fundo } = montar(true);
    toque(item, "touchstart", 200, 300, 0);
    toque(item, "touchmove", 140, 302, 30);
    expect(Number(fundo.style.opacity)).toBeCloseTo(0.8, 1);
    toque(item, "touchmove", 60, 304, 60);
    vi.useFakeTimers();
    toque(item, "touchend", 0, 0, 90);
    // Primeiro a gaveta termina de sair; só então fecha (antes sumia no meio do caminho).
    expect(fechou).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    vi.useRealTimers();
    expect(fechou).toHaveBeenCalledTimes(1);
  });

  it("arrastar na vertical é rolagem: não fecha", () => {
    const { fechou, item } = montar(true);
    arrastar(item, -10, 200);
    expect(fechou).not.toHaveBeenCalled();
  });

  it("arrastar para o lado de abrir não faz nada", () => {
    const { fechou, item, gaveta } = montar(true);
    arrastar(item, 150, 0);
    expect(fechou).not.toHaveBeenCalled();
    expect(gaveta.style.transform).toBe("");
  });

  it("sem qualquerPonto, só a alça fecha (gavetas de baixo continuam como antes)", () => {
    const { fechou, item } = montar(false);
    arrastar(item, -200, 0);
    expect(fechou).not.toHaveBeenCalled();
  });
});
