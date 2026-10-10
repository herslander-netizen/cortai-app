// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AgendaTimeline } from "../AgendaTimeline";
import type { AgendaItem } from "@/lib/barbeiro.functions";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const item = {
  id: "a1",
  inicio: "2099-10-09T17:00:00.000Z",
  fim: "2099-10-09T17:30:00.000Z",
  status: "agendado",
  forma_pagamento: null,
  valor_centavos: 5500,
  clienteId: "c1",
  cliente: "Teste01",
  telefone: null,
  ficha: null,
  servico: "Cabelo",
  duracaoMin: 30,
  profissional: "Joao",
  arrivedAt: null,
  startedAt: null,
  finishedAt: null,
  profissionalId: "p1",
} satisfies AgendaItem;

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
});

function evento(tipo: string, y: number, extra: Record<string, unknown> = {}) {
  const e = new Event(tipo, { bubbles: true, cancelable: true });
  Object.assign(e, { clientX: 100, clientY: y, pointerId: 1, pointerType: "mouse", ...extra });
  return e;
}

describe("arrastar na Timeline (mouse)", () => {
  it("soltar depois de arrastar chama onMover com o deslocamento em minutos", () => {
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
    const onMover = vi.fn();
    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const raiz = createRoot(alvo);
    limpar.push(() => act(() => raiz.unmount()));
    act(() =>
      raiz.render(
        createElement(AgendaTimeline, {
          dia: "2099-10-09",
          fuso: "America/Sao_Paulo",
          itens: [item],
          horarios: [],
          selecionado: null,
          onSelecionar: () => {},
          onMover,
        }),
      ),
    );
    const bloco = alvo.querySelector<HTMLElement>("[aria-pressed]");
    expect(bloco).not.toBeNull();
    act(() => {
      bloco!.dispatchEvent(evento("pointerdown", 200));
      bloco!.dispatchEvent(evento("pointermove", 260));
      bloco!.dispatchEvent(evento("pointerup", 260));
    });
    expect(onMover).toHaveBeenCalledTimes(1);
    const delta = onMover.mock.calls[0]?.[1] as number;
    expect(delta).toBeGreaterThan(0);
    expect(delta % 15).toBe(0);
  });
});
