// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { TransicaoVisualizacaoAgenda } from "./TransicaoVisualizacaoAgenda";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let raiz: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => raiz?.unmount());
  host?.remove();
  raiz = null;
  host = null;
});

function montar() {
  host = document.createElement("div");
  host.className = "grid";
  document.body.appendChild(host);
  raiz = createRoot(host);
}

async function renderizar(visualizacao: "lista" | "timeline") {
  await act(async () => {
    raiz?.render(
      <TransicaoVisualizacaoAgenda visualizacao={visualizacao}>
        <p>{visualizacao === "lista" ? "Lista carregada" : "Timeline carregada"}</p>
      </TransicaoVisualizacaoAgenda>,
    );
  });
}

function visao(visualizacao: "lista" | "timeline") {
  return host?.querySelector<HTMLElement>(`[data-visualizacao="${visualizacao}"]`) ?? null;
}

describe("TransicaoVisualizacaoAgenda", () => {
  it("exibe uma única visão e mantém a anterior oculta sem sobreposição", async () => {
    montar();
    await renderizar("lista");
    expect(visao("lista")?.textContent).toContain("Lista carregada");
    expect(visao("timeline")).toBeNull();

    await renderizar("timeline");
    expect(visao("timeline")?.textContent).toContain("Timeline carregada");
    expect(getComputedStyle(visao("timeline")!).display).not.toBe("none");
    expect(getComputedStyle(visao("lista")!).display).toBe("none");

    await renderizar("lista");
    expect(getComputedStyle(visao("lista")!).display).not.toBe("none");
    expect(getComputedStyle(visao("timeline")!).display).toBe("none");
  });

  it("preserva o estado interno ao voltar à visão visitada", async () => {
    montar();
    let montagens = 0;
    function CartaoPersistente() {
      const [contador, setContador] = useState(() => {
        montagens += 1;
        return 3;
      });
      return (
        <button type="button" onClick={() => setContador((n) => n + 1)}>
          Cartão {contador}
        </button>
      );
    }
    const trocar = async (tipo: "lista" | "timeline") => {
      await act(async () => {
        raiz?.render(
          <TransicaoVisualizacaoAgenda visualizacao={tipo}>
            {tipo === "lista" ? <CartaoPersistente /> : <p>Timeline</p>}
          </TransicaoVisualizacaoAgenda>,
        );
      });
    };
    await trocar("lista");
    act(() => host!.querySelector("button")!.click());
    expect(visao("lista")?.textContent).toBe("Cartão 4");
    await trocar("timeline");
    await trocar("lista");
    expect(visao("lista")?.textContent).toBe("Cartão 4");
    expect(montagens).toBe(1);
  });

  it("não acumula cópias ao alternar rapidamente", async () => {
    montar();
    await renderizar("lista");
    await renderizar("timeline");
    await renderizar("lista");
    await renderizar("timeline");
    expect(host?.querySelectorAll('[data-visualizacao="lista"]')).toHaveLength(1);
    expect(host?.querySelectorAll('[data-visualizacao="timeline"]')).toHaveLength(1);
    expect(getComputedStyle(visao("lista")!).display).toBe("none");
    expect(getComputedStyle(visao("timeline")!).display).not.toBe("none");
  });
});
