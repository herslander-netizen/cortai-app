// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCabecalhoCompacto } from "./useCabecalhoCompacto";

type ObservadorFalso = {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit | undefined;
  alvo: Element | null;
  desligado: boolean;
  disparar: () => void;
};

const observadores: ObservadorFalso[] = [];

const IntersectionObserverFalso = vi.fn(function (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
) {
  const registro: ObservadorFalso = {
    callback,
    options,
    alvo: null,
    desligado: false,
    disparar() {
      if (!registro.alvo) throw new Error("O título não foi observado.");
      const retangulo = registro.alvo.getBoundingClientRect();
      const entrada = {
        target: registro.alvo,
        isIntersecting: retangulo.bottom > 0,
        intersectionRatio: retangulo.bottom > 0 ? 1 : 0,
        boundingClientRect: retangulo,
        intersectionRect: retangulo,
        rootBounds: null,
        time: 0,
      } as IntersectionObserverEntry;
      registro.callback([entrada], registro as unknown as IntersectionObserver);
    },
  };
  Object.assign(registro, {
    observe: (alvo: Element) => {
      registro.alvo = alvo;
    },
    unobserve: () => undefined,
    disconnect: () => {
      registro.desligado = true;
    },
    takeRecords: () => [],
  });
  observadores.push(registro);
  return registro as unknown as IntersectionObserver;
});

function Exemplo() {
  const { ref, visivel } = useCabecalhoCompacto({
    enabled: true,
    chave: "/barbeiro/servicos:Serviços",
  });
  return (
    <div data-scroll-root style={{ height: "80px", overflowY: "auto" }}>
      <header ref={ref}>
        <h1>Serviços</h1>
      </header>
      <output data-visivel={String(visivel)} />
    </div>
  );
}

let raizReact: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  if (raizReact) act(() => raizReact?.unmount());
  raizReact = null;
  host?.remove();
  host = null;
  observadores.length = 0;
  vi.unstubAllGlobals();
});

describe("useCabecalhoCompacto", () => {
  it("mostra o compacto só quando o título passou acima do topo da raiz rolável", () => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverFalso as unknown as typeof IntersectionObserver);
    host = document.createElement("div");
    document.body.append(host);
    raizReact = createRoot(host);

    act(() => raizReact?.render(<Exemplo />));

    const scrollRoot = host.querySelector<HTMLElement>("[data-scroll-root]");
    const titulo = host.querySelector("h1");
    const saida = host.querySelector("output");
    const observador = observadores[0];

    expect(scrollRoot).not.toBeNull();
    expect(titulo).not.toBeNull();
    expect(saida).not.toBeNull();
    expect(observador).toBeDefined();
    expect(observador?.options?.root).toBe(scrollRoot);
    expect(observador?.alvo).toBe(titulo);

    if (!scrollRoot || !titulo || !saida || !observador) {
      throw new Error("Estrutura de teste incompleta.");
    }

    Object.defineProperty(scrollRoot, "clientHeight", { configurable: true, value: 80 });
    vi.spyOn(scrollRoot, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 80));
    let topoTitulo = 100;
    vi.spyOn(titulo, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(0, topoTitulo, 120, 24),
    );

    // Mesmo fora da viewport por baixo, ainda não deve aparecer o compacto.
    scrollRoot.scrollTop = 80;
    act(() => observador.disparar());
    expect(saida.getAttribute("data-visivel")).toBe("false");

    // Só aparece depois que o título passa completamente acima do topo.
    topoTitulo = -30;
    act(() => observador.disparar());
    expect(saida.getAttribute("data-visivel")).toBe("true");

    // Ao retornar ao topo, o título expandido volta a ser a referência.
    scrollRoot.scrollTop = 0;
    topoTitulo = 8;
    act(() => scrollRoot.dispatchEvent(new Event("scroll")));
    expect(saida.getAttribute("data-visivel")).toBe("false");

    act(() => raizReact?.unmount());
    raizReact = null;
    expect(observador.desligado).toBe(true);
  });
});
