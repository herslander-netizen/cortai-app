// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any -- eventos de ponteiro simulados */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TEMPO_DO_TOQUE_LONGO_MS, useToqueLongo } from "./useToqueLongo";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root | null = null;
let host: HTMLDivElement | null = null;

function ponteiro(tipo: string, extra: Record<string, unknown> = {}) {
  const Ctor: any = (window as any).PointerEvent ?? MouseEvent;
  return new Ctor(tipo, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: 10,
    clientY: 10,
    ...extra,
  });
}

function montar(aoSegurar: (() => void) | undefined, ativo = true) {
  const aoClicar = vi.fn();
  const estado = { segurando: false };
  function Botao() {
    const t = useToqueLongo(aoSegurar, { ativo });
    estado.segurando = t.segurando;
    return createElement("button", { id: "b", onClick: aoClicar, ...t.propriedades }, "+");
  }
  host = document.createElement("div");
  document.body.appendChild(host);
  raiz = createRoot(host);
  act(() => raiz!.render(createElement(Botao)));
  const botao = host.querySelector<HTMLButtonElement>("#b")!;
  const disparar = (e: Event) => act(() => void botao.dispatchEvent(e));
  return { botao, aoClicar, estado, disparar };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  act(() => raiz?.unmount());
  host?.remove();
  raiz = null;
  host = null;
  vi.useRealTimers();
});
const passar = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("useToqueLongo", () => {
  it("segurar até o fim chama a ação uma vez e NÃO deixa o clique passar", () => {
    const aoSegurar = vi.fn();
    const { botao, aoClicar, estado, disparar } = montar(aoSegurar);
    disparar(ponteiro("pointerdown"));
    expect(estado.segurando).toBe(true);
    passar(TEMPO_DO_TOQUE_LONGO_MS - 50);
    expect(aoSegurar).not.toHaveBeenCalled();
    passar(60);
    expect(aoSegurar).toHaveBeenCalledTimes(1);
    expect(estado.segurando).toBe(false);
    disparar(ponteiro("pointerup"));
    act(() => botao.click()); // o clique que o navegador dispara ao soltar
    expect(aoClicar).not.toHaveBeenCalled();
    passar(2_000);
    expect(aoSegurar).toHaveBeenCalledTimes(1);
  });

  it("toque curto continua sendo um clique normal e não chama a ação", () => {
    const aoSegurar = vi.fn();
    const { botao, aoClicar, disparar } = montar(aoSegurar);
    disparar(ponteiro("pointerdown"));
    passar(150);
    disparar(ponteiro("pointerup"));
    act(() => botao.click());
    passar(2_000);
    expect(aoSegurar).not.toHaveBeenCalled();
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it("depois de um segurar, o PRÓXIMO clique volta a funcionar", () => {
    const { botao, aoClicar, disparar } = montar(vi.fn());
    disparar(ponteiro("pointerdown"));
    passar(TEMPO_DO_TOQUE_LONGO_MS + 10);
    disparar(ponteiro("pointerup"));
    act(() => botao.click());
    expect(aoClicar).not.toHaveBeenCalled();
    passar(1_000);
    act(() => botao.click());
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it("segurar, mas soltar sem que o clique chegue, não engole o clique seguinte (nova pressão)", () => {
    const { botao, aoClicar, disparar } = montar(vi.fn());
    disparar(ponteiro("pointerdown"));
    passar(TEMPO_DO_TOQUE_LONGO_MS + 10);
    disparar(ponteiro("pointerup"));
    passar(500); // a trava expira
    act(() => botao.click());
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["mover o dedo (rolagem)", () => ponteiro("pointermove", { clientX: 40, clientY: 10 })],
    ["o navegador cancelar o toque", () => ponteiro("pointercancel")],
    // O React sintetiza onPointerLeave a partir de pointerout com destino fora do elemento.
    ["o ponteiro sair do botão", () => ponteiro("pointerout", { relatedTarget: document.body })],
  ])("%s desfaz o gesto", (_nome, evento) => {
    const aoSegurar = vi.fn();
    const { estado, disparar } = montar(aoSegurar);
    disparar(ponteiro("pointerdown"));
    disparar(evento());
    expect(estado.segurando).toBe(false);
    passar(2_000);
    expect(aoSegurar).not.toHaveBeenCalled();
  });

  it("tremida pequena do dedo não cancela", () => {
    const aoSegurar = vi.fn();
    const { disparar } = montar(aoSegurar);
    disparar(ponteiro("pointerdown"));
    disparar(ponteiro("pointermove", { clientX: 14, clientY: 13 }));
    passar(TEMPO_DO_TOQUE_LONGO_MS + 10);
    expect(aoSegurar).toHaveBeenCalledTimes(1);
  });

  it("sem ação, ou desativado (menu aberto), não faz nada e deixa o clique passar", () => {
    const semAcao = montar(undefined);
    semAcao.disparar(ponteiro("pointerdown"));
    passar(2_000);
    expect(semAcao.estado.segurando).toBe(false);
    act(() => raiz?.unmount());
    host?.remove();

    const aoSegurar = vi.fn();
    const desativado = montar(aoSegurar, false);
    desativado.disparar(ponteiro("pointerdown"));
    passar(2_000);
    act(() => desativado.botao.click());
    expect(aoSegurar).not.toHaveBeenCalled();
    expect(desativado.aoClicar).toHaveBeenCalledTimes(1);
  });

  it("botão direito do mouse não conta como segurar", () => {
    const aoSegurar = vi.fn();
    const { disparar } = montar(aoSegurar);
    disparar(ponteiro("pointerdown", { button: 2, pointerType: "mouse" }));
    passar(2_000);
    expect(aoSegurar).not.toHaveBeenCalled();
  });

  it("bloqueia o menu do sistema (segurar no celular) só quando está ativo", () => {
    const ativo = montar(vi.fn());
    const evento = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    ativo.disparar(evento);
    expect(evento.defaultPrevented).toBe(true);
    act(() => raiz?.unmount());
    host?.remove();
    const inativo = montar(undefined);
    const outro = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    inativo.disparar(outro);
    expect(outro.defaultPrevented).toBe(false);
  });

  it("desmontar no meio do gesto não dispara nada", () => {
    const aoSegurar = vi.fn();
    const { disparar } = montar(aoSegurar);
    disparar(ponteiro("pointerdown"));
    act(() => raiz?.unmount());
    raiz = null;
    passar(2_000);
    expect(aoSegurar).not.toHaveBeenCalled();
  });
});
