// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "@/hooks/use-mobile";

import { FaixaOperacao } from "./FaixaOperacao";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let raiz: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => raiz?.unmount());
  host?.remove();
  raiz = null;
  host = null;
  vi.restoreAllMocks();
});

function prepararLargura(largura: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: largura });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: query === "(max-width: 600px)" ? largura <= 600 : false,
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

function Exemplo() {
  const visivel = useMediaQuery("(max-width: 600px)");
  return (
    <FaixaOperacao
      visivel={visivel}
      visualizacao="timeline"
      onVisualizacao={vi.fn()}
      onTeclasVisualizacao={vi.fn()}
      mostrarAgora={false}
      fuso="America/Sao_Paulo"
      menuAberto={false}
      onAlternarMenu={vi.fn()}
    />
  );
}

async function montar(largura: number) {
  prepararLargura(largura);
  host = document.createElement("div");
  document.body.appendChild(host);
  raiz = createRoot(host);
  await act(async () => raiz?.render(<Exemplo />));
}

describe("FaixaOperacao", () => {
  it("mostra Timeline e Lista em 390 px", async () => {
    await montar(390);
    expect(host?.querySelector('[aria-label="Timeline"]')).not.toBeNull();
    expect(host?.querySelector('[aria-label="Lista"]')).not.toBeNull();
  });

  it.each([601, 1280])("não aparece em %i px", async (largura) => {
    await montar(largura);
    expect(host?.querySelector(".agenda-faixa-operacao")).toBeNull();
  });

  it("remove a transição quando reduzir movimento está ativo", async () => {
    await montar(390);
    expect(host?.querySelector('[aria-label="Timeline"]')?.className).toContain(
      "motion-reduce:transition-none",
    );
  });
});
