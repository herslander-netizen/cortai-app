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
        menuAberto={false}
        onAlternarMenu={vi.fn()}
      />,
    ),
  );
  return onVisualizacao;
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
    expect(host?.querySelector(".agenda-botao-agora-principal")).toBeNull();
  });

  it("alterna entre Timeline e Lista", async () => {
    const onVisualizacao = await montar(390);
    const botao = host?.querySelector<HTMLButtonElement>('[aria-label="Alternar para Lista"]');
    act(() => botao?.click());
    expect(onVisualizacao).toHaveBeenCalledWith("lista");
    expect(botao?.className).toContain("motion-reduce:transition-none");
  });

  it("leva ao agora na Timeline", async () => {
    const ir = vi.fn();
    publicarAgora({ lado: "visivel", ir });
    await montar(390);
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Ir para agora"]')?.click());
    expect(ir).toHaveBeenCalledOnce();
  });

  it("troca da Lista para Timeline antes de levar ao agora", async () => {
    const onVisualizacao = await montar(390, "lista");
    act(() => host?.querySelector<HTMLButtonElement>('[aria-label="Ir para agora"]')?.click());
    expect(onVisualizacao).toHaveBeenCalledWith("timeline");
  });
});