// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DURACAO_DO_PASSO_MS, SequenciaDaEntrada } from "./SequenciaDaEntrada";

const movimento = vi.hoisted(() => ({ reduzido: false }));

vi.mock("framer-motion", async (importOriginal) => {
  const original = await importOriginal<typeof import("framer-motion")>();
  return { ...original, useReducedMotion: () => movimento.reduzido };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montar() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root?.render(createElement(SequenciaDaEntrada)));
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  movimento.reduzido = false;
  vi.useRealTimers();
});

describe("SequenciaDaEntrada", () => {
  it("apresenta cinco demonstrações e permite escolher cada uma pela navegação", async () => {
    const alvo = await montar();
    const nav = alvo.querySelector('nav[aria-label="Navegação das demonstrações"]');
    const botoes = [...(nav?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const painel = alvo.querySelector<HTMLElement>('[role="tabpanel"]');

    expect(botoes).toHaveLength(5);
    expect(botoes.map((botao) => botao.getAttribute("aria-label"))).toEqual([
      "Site",
      "Agenda",
      "Atendimento Automatizado",
      "Financeiro",
      "Fila de espera",
    ]);
    expect(botoes[0]?.getAttribute("aria-current")).toBe("page");
    expect(painel?.getAttribute("aria-label")).toBe("Seu site próprio e marca");
    expect(alvo.querySelector("h2")?.textContent).toBe("Seu site próprio e marca");

    await act(async () => botoes[2]?.click());
    expect(botoes[2]?.getAttribute("aria-current")).toBe("page");
    expect(botoes[0]?.hasAttribute("aria-current")).toBe(false);
    expect(alvo.querySelector('[role="tabpanel"]')?.getAttribute("aria-label")).toBe(
      "Atendimento e lembretes via WhatsApp",
    );
    expect(alvo.querySelector("h2")?.textContent).toBe("Atendimento e lembretes via WhatsApp");

    await act(async () => botoes[4]?.click());
    expect(alvo.querySelector("h2")?.textContent).toBe("Fila de espera automática");
  });

  it("pausa o avanço automático enquanto a pessoa navega com foco", async () => {
    vi.useFakeTimers();
    const alvo = await montar();
    const botoes = [...alvo.querySelectorAll<HTMLButtonElement>("nav button")];
    const fora = document.createElement("button");
    host?.appendChild(fora);

    await act(async () => botoes[0]?.focus());
    await act(async () => vi.advanceTimersByTime(DURACAO_DO_PASSO_MS * 2));
    expect(botoes[0]?.getAttribute("aria-current")).toBe("page");

    await act(async () => fora.focus());
    await act(async () => vi.advanceTimersByTime(DURACAO_DO_PASSO_MS));
    expect(botoes[1]?.getAttribute("aria-current")).toBe("page");
  });

  it("não avança automaticamente quando o aparelho pede movimento reduzido", async () => {
    vi.useFakeTimers();
    movimento.reduzido = true;
    const alvo = await montar();
    const botoes = [...alvo.querySelectorAll<HTMLButtonElement>("nav button")];

    await act(async () => vi.advanceTimersByTime(DURACAO_DO_PASSO_MS * 3));
    expect(botoes[0]?.getAttribute("aria-current")).toBe("page");
  });

  it("mantém a demonstração dentro do cartão e exibe cinco atalhos", async () => {
    const alvo = await montar();
    const demo = alvo.querySelector<HTMLElement>(".entrada-cartao-demo");
    const legenda = alvo.querySelector<HTMLElement>(".entrada-cartao-legenda");
    const cartao = alvo.querySelector<HTMLElement>(".entrada-cartao");

    expect(demo?.style.flex).toBe("1 1 0px");
    expect(demo?.style.minHeight).toBe("0px");
    expect(demo?.style.overflow).toBe("hidden");
    expect(legenda?.style.minHeight).toBe("84px");
    expect(legenda?.style.flexShrink).toBe("0");
    expect(cartao?.style.width).toBe("100%");
    expect(cartao?.style.flex).toBe("1 1 0px");
    expect(cartao?.style.minHeight).toBe("0px");
    expect(cartao?.style.display).toBe("flex");
    expect(cartao?.style.flexDirection).toBe("column");
    expect(alvo.querySelector(".entrada-sequencia")?.getAttribute("style")).toContain("flex: 1");
    expect(alvo.querySelectorAll("nav button")).toHaveLength(5);
    expect(alvo.querySelector(".entrada-cartao")?.textContent).toContain(
      "Seu site próprio e marca",
    );
    expect(cartao?.getAttribute("style")).toContain("var(--elevacao-2)");
  });
});
