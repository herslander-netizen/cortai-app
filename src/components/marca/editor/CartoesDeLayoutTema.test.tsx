// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { configPadrao } from "@/lib/pagina-config";
import { ESTILOS_DO_CHAT } from "@/lib/estilos-chat";
import {
  CartaoDeEstiloDoChat,
  CartaoDeLayout,
  CartaoDeTema,
} from "./CartoesDeLayoutTema";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const roots: Array<{ host: HTMLDivElement; root: ReturnType<typeof createRoot> }> = [];

async function montar(element: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push({ host, root });
  await act(async () => root.render(element));
  return host;
}

afterEach(async () => {
  await act(async () => {
    for (const item of roots.splice(0)) item.root.unmount();
  });
  document.body.replaceChildren();
});

describe("cartões de Layout & Tema", () => {
  it("aplica o recuo ao cartão de layout selecionado e mantém o clique acessível", async () => {
    const escolher = vi.fn();
    const host = await montar(
      createElement(CartaoDeLayout, {
        layout: "figaro-site-completo",
        selecionado: true,
        escolher,
      }),
    );
    expect(host.querySelector('[data-recuo="ativo"]')).not.toBeNull();
    const botao = host.querySelector('button[aria-pressed="true"]') as HTMLButtonElement;
    expect(botao).not.toBeNull();
    await act(async () => botao.click());
    expect(escolher).toHaveBeenCalledTimes(1);
  });

  it("aplica o recuo ao tema selecionado", async () => {
    const escolher = vi.fn();
    const host = await montar(
      createElement(CartaoDeTema, {
        tema: "figaro-classico",
        selecionado: true,
        escolher,
      }),
    );
    expect(host.querySelector('[data-recuo="ativo"]')).not.toBeNull();
    expect(host.querySelector('button[aria-pressed="true"]')).not.toBeNull();
    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
    expect(escolher).toHaveBeenCalledTimes(1);
  });

  it("aplica o recuo ao estilo do chat selecionado", async () => {
    const escolher = vi.fn();
    const config = configPadrao();
    const estilo = ESTILOS_DO_CHAT[0]!;
    const host = await montar(
      createElement(CartaoDeEstiloDoChat, {
        estilo,
        selecionado: true,
        escolher,
        cores: config.cores,
        destaque: config.cores.botao,
      }),
    );
    expect(host.querySelector('[data-recuo="ativo"]')).not.toBeNull();
    expect(host.querySelector('button[aria-pressed="true"]')).not.toBeNull();
    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
    expect(escolher).toHaveBeenCalledTimes(1);
  });
});
