// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ConclusaoDoOnboarding } from "./ConclusaoDoOnboarding";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
afterEach(() => {
  host?.remove();
  host = null;
  vi.useRealTimers();
});

function montar(menos: boolean, carregando = false) {
  window.matchMedia = ((query: string) => ({
    matches: menos,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const props = {
    titulo: "Sua barbearia já pode receber agendamentos.",
    link: "https://cortai.dev/loja",
    linkCurto: "cortai.dev/loja",
    copiado: false,
    onCopiar: vi.fn(),
    onCompartilhar: vi.fn(),
    onIrParaAgenda: vi.fn(),
    onRevisar: vi.fn(),
  };
  act(() => root.render(<ConclusaoDoOnboarding {...props} carregando={carregando} />));
  return { props, root };
}

describe("ConclusaoDoOnboarding", () => {
  beforeAll(() => {
    window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;
  });

  it("digita o link aos poucos e o leitor de tela lê o link inteiro", async () => {
    vi.useFakeTimers();
    montar(false);
    const link = () => host!.querySelector<HTMLElement>("[aria-label='cortai.dev/loja']")!;
    const visivel = () => link().querySelector("span[aria-hidden]")!.firstChild!.textContent;
    expect(visivel()).toBe("");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(32 * 6 + 5);
    });
    expect(visivel()).toBe("cortai");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(32 * 20);
    });
    expect(visivel()).toBe("cortai.dev/loja");
  });

  it("com menos movimento mostra o link inteiro de uma vez", () => {
    montar(true);
    const link = host!.querySelector<HTMLElement>("[aria-label='cortai.dev/loja']")!;
    expect(link.querySelector("span[aria-hidden]")!.firstChild!.textContent).toBe(
      "cortai.dev/loja",
    );
  });

  it("liga os botões às ações", () => {
    const { props: p } = montar(true);
    const botao = (t: string) =>
      Array.from(host!.querySelectorAll("button")).find((b) => b.textContent?.includes(t))!;
    act(() => botao("Copiar link").click());
    act(() => botao("Compartilhar").click());
    act(() => botao("Ir para a agenda").click());
    act(() => botao("Revisar configuração").click());
    expect(p.onCopiar).toHaveBeenCalled();
    expect(p.onCompartilhar).toHaveBeenCalled();
    expect(p.onIrParaAgenda).toHaveBeenCalled();
    expect(p.onRevisar).toHaveBeenCalled();
  });

  it("enquanto carrega mostra só a espera, sem os botões", () => {
    montar(true, true);
    expect(host!.textContent).toContain("Configurando sua página…");
    expect(host!.textContent).toContain("Isso levará apenas um instante.");
    expect(host!.querySelector("[role=progressbar]")).not.toBeNull();
    expect(Array.from(host!.querySelectorAll("button"))).toHaveLength(0);
  });

  it("ao terminar o anel vira o visto e o conteúdo aparece", () => {
    const { props, root } = montar(true, true);
    act(() => root.render(<ConclusaoDoOnboarding {...props} carregando={false} />));
    expect(host!.querySelector("svg[role=img][aria-label='Concluído']")).not.toBeNull();
    expect(host!.textContent).toContain("Ir para a agenda");
    expect(host!.textContent).toContain(props.titulo);
  });
});
