// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { publicarAgora } from "./pilula-agora";
import { BotaoAgoraPrincipal } from "./BotaoAgoraPrincipal";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let raiz: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => raiz?.unmount());
  publicarAgora({ lado: null, ir: null });
  host?.remove();
  raiz = null;
  host = null;
  vi.restoreAllMocks();
});

function prepararLargura(largura: number, reduzir = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(max-width: 600px)" ? largura <= 600 : reduzir,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

async function montar(
  largura: number,
  visualizacao: "timeline" | "lista" = "timeline",
  onVisualizacao = vi.fn(),
  ehHoje = true,
  onHoje = vi.fn(),
) {
  prepararLargura(largura);
  host = document.createElement("div");
  document.body.appendChild(host);
  raiz = createRoot(host);
  await act(async () =>
    raiz?.render(
      <BotaoAgoraPrincipal
        visualizacao={visualizacao}
        onVisualizacao={onVisualizacao}
        ehHoje={ehHoje}
        onHoje={onHoje}
        menuAberto={false}
        onAlternarMenu={vi.fn()}
      />,
    ),
  );
  return { onVisualizacao, onHoje };
}

describe("BotaoAgoraPrincipal", () => {
  it("aparece em 390 px e não aparece em 1280 px", async () => {
    await montar(390);
    expect(host?.querySelector(".agenda-botao-agora-principal")).not.toBeNull();
    act(() => raiz?.unmount());
    raiz = null;
    host?.remove();
    host = null;
    await montar(1280);
    expect(document.querySelector(".agenda-botao-agora-principal")).toBeNull();
  });

  it("alterna entre Timeline e Lista", async () => {
    const { onVisualizacao } = await montar(390);
    const botao = host?.querySelector<HTMLButtonElement>('[aria-label="Mostrar Lista"]');
    act(() => botao?.click());
    expect(onVisualizacao).toHaveBeenCalledWith("lista");
    expect(botao?.querySelector("svg")).not.toBeNull();
  });

  it("leva ao agora na Timeline", async () => {
    const ir = vi.fn();
    publicarAgora({ lado: "visivel", ir });
    await montar(390);
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Ir para agora"]')?.click());
    expect(ir).toHaveBeenCalledOnce();
  });

  it("mantém a Lista e leva ao primeiro atendimento aberto", async () => {
    const { onVisualizacao } = await montar(390, "lista");
    const rolar = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const item = document.createElement("li");
    item.className = "agenda-item";
    vi.spyOn(item, "getBoundingClientRect").mockReturnValue({
      top: 240,
      bottom: 300,
      left: 0,
      right: 300,
      width: 300,
      height: 60,
      x: 0,
      y: 240,
      toJSON: () => ({}),
    });
    const painel = document.createElement("div");
    painel.id = "agenda-painel-visualizacao";
    painel.appendChild(item);
    document.body.appendChild(painel);
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Ir para agora"]')?.click());
    expect(onVisualizacao).not.toHaveBeenCalled();
    expect(rolar).toHaveBeenCalledWith({ top: 232, behavior: "smooth" });
    painel.remove();
  });

  it("fora de hoje volta para hoje antes de levar ao agora", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const ir = vi.fn();
    publicarAgora({ lado: "visivel", ir });
    const onHoje = vi.fn();
    await montar(390, "timeline", vi.fn(), false, onHoje);
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Ir para agora"]')?.click());
    expect(onHoje).toHaveBeenCalledOnce();
    expect(ir).not.toHaveBeenCalled();

    await act(async () =>
      raiz?.render(
        <BotaoAgoraPrincipal
          visualizacao="timeline"
          onVisualizacao={vi.fn()}
          ehHoje
          onHoje={onHoje}
          menuAberto={false}
          onAlternarMenu={vi.fn()}
        />,
      ),
    );
    expect(ir).toHaveBeenCalledOnce();
  });
});
