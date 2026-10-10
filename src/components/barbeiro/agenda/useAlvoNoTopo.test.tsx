// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { acharAlvoNoTopo, useAlvoNoTopo } from "./useAlvoNoTopo";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

afterEach(() => {
  document.body.innerHTML = "";
});

function tela(rotulo: string, comAgenda: boolean) {
  const t = document.createElement("div");
  t.className = "management-shell";
  t.dataset["tela"] = rotulo;
  t.innerHTML = `<div id="topo-centro"></div>${comAgenda ? '<div class="agenda-operacional"></div>' : ""}`;
  document.body.appendChild(t);
  return t;
}

describe("acharAlvoNoTopo", () => {
  it("devolve null sem a barra e o único alvo quando só há um", () => {
    expect(acharAlvoNoTopo("topo-centro")).toBeNull();
    const t = tela("a", true);
    expect(acharAlvoNoTopo("topo-centro")).toBe(t.querySelector("#topo-centro"));
  });
  it("com duas barras ao mesmo tempo, escolhe a da tela da Agenda", () => {
    tela("antiga", false);
    const nova = tela("nova", true);
    expect(acharAlvoNoTopo("topo-centro")).toBe(nova.querySelector("#topo-centro"));
  });
});

describe("useAlvoNoTopo", () => {
  it("acompanha a barra quando ela é refeita", async () => {
    let atual: HTMLElement | null = null;
    function Sonda() {
      atual = useAlvoNoTopo("topo-centro");
      return null;
    }
    const antiga = tela("a", true);
    const raiz = document.createElement("div");
    document.body.appendChild(raiz);
    const r = createRoot(raiz);
    await act(async () => r.render(createElement(Sonda)));
    expect(atual).toBe(antiga.querySelector("#topo-centro"));
    await act(async () => {
      antiga.remove();
      tela("b", true);
    });
    await act(async () => Promise.resolve());
    expect(atual).not.toBeNull();
    expect(atual!.isConnected).toBe(true);
    await act(async () => r.unmount());
  });
});
