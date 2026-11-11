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

async function renderizar(visualizacao: "lista" | "timeline") {
  await act(async () => {
    raiz?.render(
      <TransicaoVisualizacaoAgenda visualizacao={visualizacao}>
        <p>{visualizacao === "lista" ? "Lista carregada" : "Timeline carregada"}</p>
      </TransicaoVisualizacaoAgenda>,
    );
  });
}

describe("TransicaoVisualizacaoAgenda", () => {
  it("troca imediatamente a árvore sem sobrepor Lista e Timeline", async () => {
    host = document.createElement("div");
    host.className = "grid";
    document.body.appendChild(host);
    raiz = createRoot(host);

    await renderizar("lista");
    expect(host.querySelectorAll("[data-visualizacao]")).toHaveLength(1);
    expect(host.textContent).toContain("Lista carregada");

    await renderizar("timeline");
    expect(host.querySelectorAll("[data-visualizacao]")).toHaveLength(1);
    expect(host.querySelector('[data-visualizacao="lista"]')).toBeNull();
    expect(host.querySelector('[data-visualizacao="timeline"]')?.textContent)
      .toContain("Timeline carregada");
  });

  it("não mantém conteúdo antigo após alternâncias rápidas", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    raiz = createRoot(host);

    await renderizar("lista");
    await renderizar("timeline");
    await renderizar("lista");
    await renderizar("timeline");

    expect(host.querySelectorAll("[data-visualizacao]")).toHaveLength(1);
    expect(host.textContent).toBe("Timeline carregada");
  });
});
