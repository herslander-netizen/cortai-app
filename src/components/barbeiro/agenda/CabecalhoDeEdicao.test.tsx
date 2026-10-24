// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { CabecalhoDeEdicao } from "./CabecalhoDeEdicao";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  window.dispatchEvent(new Event("scroll"));
});

describe("CabecalhoDeEdicao", () => {
  it("muda a superfície quando a página rola e volta ao topo ao subir", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });

    await act(async () => {
      root?.render(createElement(CabecalhoDeEdicao, { dia: "2026-10-24", naBarra: true }));
    });

    const cabecalho = host.querySelector<HTMLElement>("[data-edicao-ui]");
    expect(cabecalho?.getAttribute("data-rolado")).toBe("false");

    await act(async () => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 80 });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(cabecalho?.getAttribute("data-rolado")).toBe("true");

    await act(async () => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(cabecalho?.getAttribute("data-rolado")).toBe("false");
  });
});
