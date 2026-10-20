// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MenuAcoesAgenda } from "./MenuAcoesAgenda";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let raiz: Root | null = null;
let host: HTMLDivElement | null = null;

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

afterEach(() => {
  act(() => raiz?.unmount());
  host?.remove();
  document.querySelector(".agenda-dial")?.remove();
  raiz = null;
  host = null;
  vi.restoreAllMocks();
});

function montar(
  onAberto = vi.fn(),
  visivel = true,
  extra: { onAgendarPorVoz?: () => void; online?: boolean } = {},
) {
  const acoes = {
    onNovoAgendamento: vi.fn(),
    onEncaixe: vi.fn(),
    onChamarFila: vi.fn(),
    onBloquear: vi.fn(),
    onEquipe: vi.fn(),
    onNovoCliente: vi.fn(),
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  raiz = createRoot(host);
  act(() => {
    raiz?.render(
      <MenuAcoesAgenda
        aberto
        onAberto={onAberto}
        fila={0}
        mostrarFila={false}
        online={extra.online ?? true}
        ocupado={false}
        visivel={visivel}
        {...(extra.onAgendarPorVoz ? { onAgendarPorVoz: extra.onAgendarPorVoz } : {})}
        {...acoes}
      />,
    );
  });
  return { onAberto, ...acoes };
}

describe("MenuAcoesAgenda", () => {
  it("fecha pelo scrim e por Escape", () => {
    const peloScrim = montar();
    act(() => document.querySelector<HTMLButtonElement>(".agenda-dial-scrim")?.click());
    expect(peloScrim.onAberto).toHaveBeenCalledWith(false);

    act(() => raiz?.unmount());
    raiz = null;
    document.querySelector(".agenda-dial")?.remove();

    const peloEscape = montar();
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(peloEscape.onAberto).toHaveBeenCalledWith(false);
  });

  it.each([
    ["Agendar horário", "onNovoAgendamento"],
    ["Atendimento avulso", "onEncaixe"],
    ["Bloquear horário", "onBloquear"],
    ["Equipe", "onEquipe"],
  ] as const)("fecha e executa %s", (rotulo, callback) => {
    const controles = montar();
    const botao = Array.from(document.querySelectorAll<HTMLButtonElement>("[role=menuitem]")).find(
      (item) => item.getAttribute("aria-label")?.startsWith(rotulo),
    );
    expect(botao).toBeDefined();
    act(() => botao?.click());
    expect(controles.onAberto).toHaveBeenCalledWith(false);
    expect(controles[callback]).toHaveBeenCalledOnce();
  });

  it("fecha e desmonta o menu quando o contexto deixa de estar visível", () => {
    const onAberto = vi.fn();
    montar(onAberto, false);
    expect(document.querySelector(".agenda-dial")).toBeNull();
    expect(onAberto).toHaveBeenCalledWith(false);
  });

  const item = (rotulo: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>("[role=menuitem]")).find((i) =>
      i.getAttribute("aria-label")?.startsWith(rotulo),
    );

  it("não mostra agendamento por voz no menu, mesmo com suporte a voz", () => {
    montar(vi.fn(), true, { onAgendarPorVoz: vi.fn() });
    expect(item("Agendar por voz")).toBeUndefined();
    expect(document.querySelectorAll("[role=menuitem]")).toHaveLength(4);
  });

  it("mantém Equipe junto das ações operacionais e executa a função existente", () => {
    const controles = montar();
    const itens = Array.from(document.querySelectorAll<HTMLElement>("[role=menuitem]")).map((i) =>
      i.getAttribute("aria-label"),
    );
    expect(itens).toHaveLength(4);
    expect(itens[0]).toMatch(/^Agendar horário/);
    expect(itens.some((rotulo) => rotulo?.startsWith("Equipe"))).toBe(true);
    act(() => item("Equipe")?.click());
    expect(controles.onAberto).toHaveBeenCalledWith(false);
    expect(controles.onEquipe).toHaveBeenCalledOnce();
  });
});
