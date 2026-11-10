// @vitest-environment jsdom
import { act, createElement, useEffect, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TransicaoDePagina } from "./TransicaoDePagina";

const rota = vi.hoisted(() => ({ caminho: "/barbeiro", indice: 1 }));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname: rota.caminho, state: { __TSR_index: rota.indice } } }),
}));
vi.mock("@/hooks/useMovimento", () => ({ useMenosMovimento: () => true }));
vi.mock("@/lib/diagnostico/telemetria", () => ({ registrar: () => undefined }));
vi.mock("framer-motion", async () => {
  const { forwardRef, createElement } = await import("react");
  return {
    motion: {
      div: forwardRef<HTMLDivElement, { children?: ReactNode }>((props, ref) =>
        createElement("div", { ref }, props.children),
      ),
    },
    useAnimationControls: () => ({
      set: () => undefined,
      start: async () => undefined,
      stop: () => undefined,
    }),
  };
});

describe("transição entre páginas sem remontar o casco", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    rota.caminho = "/barbeiro";
    rota.indice = 1;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it("mantém os componentes compartilhados montados após navegar e voltar", async () => {
    let montagens = 0;
    let desmontagens = 0;
    function Casco({ children }: { children: ReactNode }) {
      useEffect(() => {
        montagens += 1;
        return () => { desmontagens += 1; };
      }, []);
      return createElement("div", null, "Menu persistente", children);
    }
    function tela() {
      return createElement(
        TransicaoDePagina,
        null,
        createElement(Casco, null, createElement("main", null, rota.caminho)),
      );
    }
    await act(async () => root.render(tela()));
    expect(montagens).toBe(1);

    rota.caminho = "/barbeiro/clientes";
    rota.indice += 1;
    await act(async () => root.render(tela()));
    expect(host.textContent).toContain("/barbeiro/clientes");
    expect(montagens).toBe(1);
    expect(desmontagens).toBe(0);

    rota.caminho = "/barbeiro";
    rota.indice += 1;
    await act(async () => root.render(tela()));
    expect(montagens).toBe(1);
    expect(desmontagens).toBe(0);
  });
});
