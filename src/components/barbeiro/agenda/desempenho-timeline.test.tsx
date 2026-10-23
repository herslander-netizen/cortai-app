// @vitest-environment jsdom
import { Profiler, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AgendaTimeline } from "../AgendaTimeline";
import type { AgendaItem } from "@/lib/barbeiro.functions";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/**
 * Orçamento de renderização da linha do tempo durante o arrasto. O Figaro só move o cartão arrastado
 * (sem recompor a lista); aqui o estado só pode mudar quando o passo de 5 min muda, não a cada pixel.
 */
function itens(n: number): AgendaItem[] {
  return Array.from({ length: n }, (_, i) => {
    const inicio = new Date(Date.UTC(2099, 9, 9, 11 + Math.floor(i / 2), (i % 2) * 30));
    const fim = new Date(inicio.getTime() + 25 * 60_000);
    return {
      id: `a${i}`,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: "agendado",
      forma_pagamento: null,
      valor_centavos: 5500,
      clienteId: `c${i}`,
      cliente: `Cliente ${i}`,
      telefone: null,
      ficha: null,
      servico: "Corte",
      duracaoMin: 25,
      profissional: "Joao",
      arrivedAt: null,
      startedAt: null,
      finishedAt: null,
      profissionalId: "p1",
    } satisfies AgendaItem;
  });
}

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
});

function evento(tipo: string, y: number) {
  const e = new Event(tipo, { bubbles: true, cancelable: true });
  Object.assign(e, { clientX: 100, clientY: y, pointerId: 1, pointerType: "mouse" });
  return e;
}

describe("desempenho da linha do tempo", () => {
  it("arrastar a alça de duração não re-renderiza a cada pixel", () => {
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
    const lista = itens(40);
    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const raiz = createRoot(alvo);
    limpar.push(() => act(() => raiz.unmount()));
    let commits = 0;
    act(() =>
      raiz.render(
        createElement(
          Profiler,
          { id: "timeline", onRender: () => void (commits += 1) },
          createElement(AgendaTimeline, {
            dia: "2099-10-09",
            fuso: "America/Sao_Paulo",
            itens: lista,
            horarios: [],
            selecionado: null,
            onSelecionar: () => {},
            onMover: vi.fn(),
            onRedimensionar: vi.fn(),
            edicaoDoCartao: { id: "a0" },
          }),
        ),
      ),
    );
    const alca = alvo.querySelector<HTMLElement>("[role=separator]");
    expect(alca).not.toBeNull();
    act(() => {
      alca!.dispatchEvent(evento("pointerdown", 300));
    });
    commits = 0;
    const MOVIMENTOS = 120;
    for (let i = 1; i <= MOVIMENTOS; i += 1) {
      act(() => {
        alca!.dispatchEvent(evento("pointermove", 300 + i));
      });
    }
    act(() => {
      alca!.dispatchEvent(evento("pointerup", 300 + MOVIMENTOS));
    });
    process.stdout.write(`renders da timeline em ${MOVIMENTOS} movimentos de 1 px: ${commits}\n`);
    // Com passo de 5 min, 120 px andam poucos passos: bem menos que um render por movimento.
    expect(commits).toBeLessThan(MOVIMENTOS / 3);
  });
});
