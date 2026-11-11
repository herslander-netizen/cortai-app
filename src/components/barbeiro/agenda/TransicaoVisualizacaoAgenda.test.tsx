// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TransicaoVisualizacaoAgenda } from "./TransicaoVisualizacaoAgenda";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("@/hooks/useMovimento", () => ({
  useMenosMovimento: () => false,
}));

let raiz: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => raiz?.unmount());
  host?.remove();
  raiz = null;
  host = null;
});

describe("TransicaoVisualizacaoAgenda", () => {
  it("sobrepõe a Lista à Timeline sem deixar uma etapa sem conteúdo", async () => {
    host = document.createElement("div");
    host.className = "grid";
    document.body.appendChild(host);
    raiz = createRoot(host);

    await act(async () => {
      raiz?.render(
        <TransicaoVisualizacaoAgenda visualizacao="lista">
          <p>Lista carregada</p>
        </TransicaoVisualizacaoAgenda>,
      );
    });

    await act(async () => {
      raiz?.render(
        <TransicaoVisualizacaoAgenda visualizacao="timeline">
          <p>Timeline carregada</p>
        </TransicaoVisualizacaoAgenda>,
      );
    });

    const entrada = host.querySelector<HTMLElement>('[data-visualizacao="timeline"]');
    expect(entrada?.textContent).toContain("Timeline carregada");

    const saida = host.querySelector<HTMLElement>('[data-visualizacao="lista"]');
    if (saida) {
      expect(saida.getAttribute("aria-hidden")).toBe("true");
      expect(saida.hasAttribute("inert")).toBe(true);
    }
  });
});
