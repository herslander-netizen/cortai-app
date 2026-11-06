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

function montar(extra: Record<string, unknown>) {
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
  act(() =>
    raiz.render(
      createElement(AgendaTimeline, {
        dia: "2099-10-09",
        fuso: "America/Sao_Paulo",
        itens: [item],
        horarios: [],
        selecionado: null,
        onSelecionar: () => {},
        ...extra,
      }),
    ),
  );
  return alvo;
}

describe("alça de duração na Timeline", () => {
  it("arrastar a alça para baixo propõe aumentar a duração, sem mover o início", () => {
    const onMover = vi.fn();
    const onRedimensionar = vi.fn();
    const alvo = montar({ onMover, onRedimensionar, edicaoDoCartao: { id: "a1", motivo: null } });
    const alca = alvo.querySelector<HTMLElement>("[role=separator]");
    expect(alca).not.toBeNull();
    act(() => {
      alca!.dispatchEvent(evento("pointerdown", 300));
      alca!.dispatchEvent(evento("pointermove", 348));
      alca!.dispatchEvent(evento("pointerup", 348));
    });
    expect(onMover).not.toHaveBeenCalled();
    expect(onRedimensionar).toHaveBeenCalledTimes(1);
    const delta = onRedimensionar.mock.calls[0]?.[1] as number;
    expect(delta).toBeGreaterThan(0);
    expect(delta % 5).toBe(0);
  });
  it("as setas do teclado mudam 5 minutos (como as listras)", () => {
    const onRedimensionar = vi.fn();
    const alvo = montar({
      onMover: vi.fn(),
      onRedimensionar,
      edicaoDoCartao: { id: "a1", motivo: null },
    });
    const alca = alvo.querySelector<HTMLElement>("[role=separator]");
    act(() => {
      alca!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
      );
    });
    expect(onRedimensionar.mock.calls[0]?.[1]).toBe(5);
  });
  it("com passo do negócio de 5 min, a alça e as setas andam de 5 em 5", () => {
    const onRedimensionar = vi.fn();
    const alvo = montar({
      onMover: vi.fn(),
      onRedimensionar,
      passoMin: 5,
      edicaoDoCartao: { id: "a1", motivo: null },
    });
    const alca = alvo.querySelector<HTMLElement>("[role=separator]");
    act(() => {
      alca!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }),
      );
    });
    expect(onRedimensionar.mock.calls[0]?.[1]).toBe(5);
  });
  it("cartão em edição mostra o intervalo sem sobrepor o motivo de validação", () => {
    const comIntervalo = montar({
      onMover: vi.fn(),
      edicaoDoCartao: { id: "a1", motivo: null },
    });
    expect(comIntervalo.textContent).toMatch(/\d{2}:\d{2} – \d{2}:\d{2}/);
    const comMotivo = montar({
      onMover: vi.fn(),
      edicaoDoCartao: { id: "a1", motivo: "Deve ser após agora" },
    });
    expect(comMotivo.querySelector("[role=alert]")).toBeNull();
    expect(comMotivo.querySelector('[aria-label="Novo horário proposto"]')?.textContent).toMatch(
      /\d{2}:\d{2} – \d{2}:\d{2}/,
    );
  });
  it("fora do modo de edição, nenhum cartão mostra a alça (como no modelo)", () => {
    const alvo = montar({ onMover: vi.fn(), onRedimensionar: vi.fn() });
    expect(alvo.querySelector("[role=separator]")).toBeNull();
  });
  it("segurar abre a edição na hora (sem esperar soltar) e não abre a ficha", () => {
    vi.useFakeTimers();
    const onEditar = vi.fn();
    const onSelecionar = vi.fn();
    const alvo = montar({ onMover: vi.fn(), onEditar, onSelecionar });
    const bloco = alvo.querySelector<HTMLElement>("[aria-pressed]")!;
    const capturar = vi.fn();
    bloco.setPointerCapture = capturar;
    act(() => {
      bloco.dispatchEvent(evento("pointerdown", 200, { pointerType: "touch" }));
      vi.advanceTimersByTime(299);
    });
    expect(onEditar).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    // Aos 300 ms, ainda com o dedo no cartão: a edição abre e o cartão já está solto (ponteiro capturado).
    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEditar).toHaveBeenCalledWith(item, 200);
    expect(capturar).toHaveBeenCalledTimes(1);
    expect(bloco.hasAttribute("data-segurando-cartao")).toBe(true);
    act(() => {
      bloco.dispatchEvent(evento("pointerup", 200, { pointerType: "touch" }));
      bloco.click();
    });
    vi.useRealTimers();
    // Soltar sem arrastar não abre de novo nem seleciona o cartão.
    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onSelecionar).not.toHaveBeenCalled();
    expect(bloco.hasAttribute("data-segurando-cartao")).toBe(false);
  });
  it("segurar e arrastar no mesmo gesto reorganiza o cartão já na primeira vez", () => {
    vi.useFakeTimers();
    const onEditar = vi.fn();
    const onMover = vi.fn();
    const onSelecionar = vi.fn();
    const alvo = montar({ onMover, onEditar, onSelecionar });
    const bloco = alvo.querySelector<HTMLElement>("[aria-pressed]")!;
    bloco.setPointerCapture = () => {};
    act(() => {
      bloco.dispatchEvent(evento("pointerdown", 200, { pointerType: "touch" }));
      vi.advanceTimersByTime(300);
    });
    expect(onEditar).toHaveBeenCalledTimes(1);

    // Com o cartão na mão, a rolagem da página não anda (o bloqueio é do toque, só nesse gesto).
    const rolagem = new Event("touchmove", { bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(rolagem);
    });
    expect(rolagem.defaultPrevented).toBe(true);

    const mover = evento("pointermove", 260, { pointerType: "touch" });
    act(() => {
      bloco.dispatchEvent(mover);
      bloco.dispatchEvent(evento("pointerup", 260, { pointerType: "touch" }));
      bloco.click();
    });
    vi.useRealTimers();
    expect(mover.defaultPrevented).toBe(true);
    expect(onMover).toHaveBeenCalledTimes(1);
    const delta = onMover.mock.calls[0]?.[1] as number;
    expect(delta).toBeGreaterThan(0);
    expect(delta % 5).toBe(0);
    // A edição abriu uma vez só (ao segurar) e soltar depois de arrastar não abre a ficha.
    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onSelecionar).not.toHaveBeenCalled();
    // Passou o gesto: a rolagem volta a funcionar.
    const depois = new Event("touchmove", { bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(depois);
    });
    expect(depois.defaultPrevented).toBe(false);
  });
  it("mexer o dedo antes dos 300 ms é rolagem: não abre a edição nem segura o cartão", () => {
    vi.useFakeTimers();
    const onEditar = vi.fn();
    const alvo = montar({ onMover: vi.fn(), onEditar });
    const bloco = alvo.querySelector<HTMLElement>("[aria-pressed]")!;
    bloco.setPointerCapture = () => {};
    act(() => {
      bloco.dispatchEvent(evento("pointerdown", 200, { pointerType: "touch" }));
      vi.advanceTimersByTime(120);
      bloco.dispatchEvent(evento("pointermove", 240, { pointerType: "touch" }));
      vi.advanceTimersByTime(400);
      bloco.dispatchEvent(evento("pointerup", 240, { pointerType: "touch" }));
    });
    vi.useRealTimers();
    expect(onEditar).not.toHaveBeenCalled();
    expect(bloco.hasAttribute("data-segurando-cartao")).toBe(false);
  });
  it("sem conseguir capturar o ponteiro, segurar volta ao jeito antigo: abre só ao soltar", () => {
    vi.useFakeTimers();
    const onEditar = vi.fn();
    const alvo = montar({ onMover: vi.fn(), onEditar });
    const bloco = alvo.querySelector<HTMLElement>("[aria-pressed]")!;
    bloco.setPointerCapture = () => {
      throw new Error("sem captura");
    };
    act(() => {
      bloco.dispatchEvent(evento("pointerdown", 200, { pointerType: "touch" }));
      vi.advanceTimersByTime(300);
    });
    expect(onEditar).not.toHaveBeenCalled();
    act(() => {
      bloco.dispatchEvent(evento("pointerup", 200, { pointerType: "touch" }));
    });
    vi.useRealTimers();
    expect(onEditar).toHaveBeenCalledTimes(1);
  });
  it("com a edição já aberta, o gesto seguinte no cartão arrasta direto (como antes)", () => {
    vi.useFakeTimers();
    const onEditar = vi.fn();
    const onMover = vi.fn();
    const alvo = montar({
      onMover,
      onEditar,
      edicaoDoCartao: { id: "a1", original: { inicio: item.inicio, fim: item.fim } },
    });
    const bloco = alvo.querySelector<HTMLElement>("[aria-pressed]")!;
    const capturar = vi.fn();
    bloco.setPointerCapture = capturar;
    expect(bloco.hasAttribute("data-sem-gesto-dia")).toBe(true);
    act(() => {
      bloco.dispatchEvent(evento("pointerdown", 200, { pointerType: "touch" }));
      bloco.dispatchEvent(evento("pointermove", 260, { pointerType: "touch" }));
      bloco.dispatchEvent(evento("pointerup", 260, { pointerType: "touch" }));
    });
    vi.useRealTimers();
    expect(capturar).toHaveBeenCalledTimes(1);
    expect(onMover).toHaveBeenCalledTimes(1);
    expect(onEditar).not.toHaveBeenCalled();
  });

  it("sem onRedimensionar não há alça (atendimento só leitura)", () => {
    const alvo = montar({ onMover: vi.fn() });
    expect(alvo.querySelector("[role=separator]")).toBeNull();
  });
});

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
    expect(delta % 5).toBe(0);
  });
});
