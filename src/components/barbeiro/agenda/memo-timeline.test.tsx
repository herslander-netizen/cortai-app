// @vitest-environment jsdom
import { act, createElement, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const agora = vi.hoisted(() => ({ renders: 0 }));
vi.mock("@/hooks/useAgora", () => ({
  useAgora: () => {
    agora.renders += 1;
    return Date.parse("2099-10-09T12:00:00.000Z");
  },
}));

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
  cliente: "Teste",
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

describe("linha do tempo memorizada", () => {
  it("não re-renderiza quando o pai muda por motivo que não afeta a grade", () => {
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

    // Props estáveis, como a tela passa agora: funções com identidade fixa e dados memorizados.
    const itens = [item];
    const horarios: never[] = [];
    const aoSelecionar = vi.fn();
    const aoMover = vi.fn();
    const aoRedimensionar = vi.fn();
    let pai: (() => void) | null = null;

    function Pai() {
      const [contador, setContador] = useState(0);
      pai = () => setContador((c) => c + 1);
      return createElement(
        "div",
        { "data-c": contador },
        createElement(
          "div",
          null,
          createElement(AgendaTimeline, {
            dia: "2099-10-09",
            fuso: "America/Sao_Paulo",
            itens,
            horarios,
            selecionado: null,
            onSelecionar: aoSelecionar,
            onMover: aoMover,
            onRedimensionar: aoRedimensionar,
          }) as ReactElement,
        ),
      );
    }

    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const raiz = createRoot(alvo);
    limpar.push(() => act(() => raiz.unmount()));
    act(() => raiz.render(createElement(Pai)));
    const primeira = agora.renders;
    expect(primeira).toBeGreaterThan(0);

    act(() => pai?.());
    act(() => pai?.());
    act(() => pai?.());
    // Três atualizações do pai, nenhuma muda a grade: a linha do tempo não deve ser refeita.
    expect(agora.renders).toBe(primeira);
  });
});
