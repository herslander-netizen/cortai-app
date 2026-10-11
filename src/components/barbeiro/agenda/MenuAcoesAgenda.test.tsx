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

  it("sem suporte a voz, o item 'Agendar por voz' não aparece", () => {
    montar();
    expect(item("Agendar por voz")).toBeUndefined();
    expect(document.querySelectorAll("[role=menuitem]")).toHaveLength(3);
  });

  it("com voz, 'Agendar por voz' aparece colado ao 'Agendar horário' e executa fechando o menu", () => {
    const onAgendarPorVoz = vi.fn();
    const controles = montar(vi.fn(), true, { onAgendarPorVoz });
    const itens = Array.from(document.querySelectorAll<HTMLElement>("[role=menuitem]")).map((i) =>
      i.getAttribute("aria-label"),
    );
    expect(itens).toHaveLength(4);
    // O DOM é invertido (flex-col-reverse): o primeiro é o que fica junto ao "+".
    expect(itens[0]).toMatch(/^Agendar horário/);
    expect(itens[1]).toMatch(/^Agendar por voz/);
    act(() => item("Agendar por voz")?.click());
    expect(controles.onAberto).toHaveBeenCalledWith(false);
    expect(onAgendarPorVoz).toHaveBeenCalledOnce();
    expect(controles.onNovoAgendamento).not.toHaveBeenCalled();
  });

  it("sem internet a voz fica indisponível (o comando depende do servidor)", () => {
    const onAgendarPorVoz = vi.fn();
    montar(vi.fn(), true, { onAgendarPorVoz, online: false });
    expect(item("Agendar por voz")?.disabled).toBe(true);
    act(() => item("Agendar por voz")?.click());
    expect(onAgendarPorVoz).not.toHaveBeenCalled();
  });
});
