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

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  it("mantém as cinco etapas acessíveis e permite escolher uma demonstração", async () => {
    const alvo = await montar();
    const abas = [...alvo.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const painel = alvo.querySelector<HTMLElement>('[role="tabpanel"]');

    expect(abas.length).toBe(5);
    expect(abas.map((aba) => aba.getAttribute("aria-label"))).toEqual([
      "Mostrar etapa: Seu site",
      "Mostrar etapa: Agendar",
      "Mostrar etapa: Lembretes",
      "Mostrar etapa: Avaliações",
      "Mostrar etapa: Desempenho",
    ]);
    expect(abas.every((aba) => aba.getAttribute("style")?.includes("48px"))).toBe(true);
    expect(abas[0]?.getAttribute("aria-selected")).toBe("true");
    expect(abas[0]?.tabIndex).toBe(0);
    expect(abas[1]?.tabIndex).toBe(-1);
    expect(painel?.getAttribute("aria-labelledby")).toBe(abas[0]?.id);
    expect(alvo.querySelector("h2")?.textContent).toBe("Seu site pronto em minutos");

    const lembretes = abas.find((aba) => aba.getAttribute("aria-label") === "Mostrar etapa: Lembretes");
    await act(async () => lembretes?.click());

    expect(lembretes?.getAttribute("aria-selected")).toBe("true");
    expect(lembretes?.tabIndex).toBe(0);
    expect(alvo.querySelector("h2")?.textContent).toBe("Menos faltas, mais agenda cheia");
  });

  it("permite navegar pelas etapas com as setas e Home/End", async () => {
    const alvo = await montar();
    const abas = [...alvo.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

    await act(async () => {
      abas[0]?.focus();
      abas[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(abas[1]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(abas[1]);

    await act(async () => {
      abas[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    });
    expect(abas[4]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(abas[4]);

    await act(async () => {
      abas[4]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });
    expect(abas[0]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(abas[0]);
  });

  it("pausa o avanço automático enquanto a pessoa navega com foco", async () => {
    vi.useFakeTimers();
    const alvo = await montar();
    const abas = [...alvo.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const fora = document.createElement("button");
    host?.appendChild(fora);

    await act(async () => abas[0]?.focus());
    await act(async () => {
      vi.advanceTimersByTime(DURACAO_DO_PASSO_MS * 2);
    });
    expect(abas[0]?.getAttribute("aria-selected")).toBe("true");

    await act(async () => fora.focus());
    await act(async () => {
      vi.advanceTimersByTime(DURACAO_DO_PASSO_MS);
    });
    expect(abas[1]?.getAttribute("aria-selected")).toBe("true");
  });

  it("não gira automaticamente quando o aparelho pede movimento reduzido", async () => {
    vi.useFakeTimers();
    movimento.reduzido = true;
    const alvo = await montar();
    const abas = [...alvo.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

    await act(async () => {
      vi.advanceTimersByTime(DURACAO_DO_PASSO_MS * 3);
    });
    expect(abas[0]?.getAttribute("aria-selected")).toBe("true");
  });

  it("mantém a demonstração dentro da moldura e usa cores legíveis do Figaro", async () => {
    const alvo = await montar();
    const demo = alvo.querySelector<HTMLElement>(".entrada-cartao-demo");
    const legenda = alvo.querySelector<HTMLElement>(".entrada-cartao-legenda");
    const siteCapa = alvo.querySelector<HTMLElement>(".ed-site-capa");

    expect(demo?.style.height).toBe("clamp(184px, 29svh, 248px)");
    expect(demo?.style.overflow).toBe("hidden");
    expect(legenda?.style.minHeight).toBe("96px");
    expect(alvo.querySelector(".entrada-sequencia")?.getAttribute("style")).toContain("flex: 1");
    expect(siteCapa?.style.height).toBe("64px");
    expect(alvo.querySelector(".entrada-cartao-legenda p")?.textContent).toBe("Seu site");
    expect(alvo.querySelector(".entrada-cartao")?.getAttribute("style")).toContain("var(--elevacao-2)");

    const abaAgendar = [...alvo.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (aba) => aba.getAttribute("aria-label") === "Mostrar etapa: Agendar",
    );
    await act(async () => abaAgendar?.click());

    const aparelho = alvo.querySelector<HTMLElement>(".entrada-demo");
    const diaAtivo = alvo.querySelector<HTMLElement>(".ed-agendar-dias [data-ativo]");
    const horarioAtivo = alvo.querySelector<HTMLElement>(".ed-agendar-horas [data-alvo]");
    expect(aparelho?.style.background).toBe("var(--figaro-primary)");
    expect(aparelho?.style.color).toBe("var(--figaro-on-primary)");
    expect(aparelho?.style.overflow).toBe("hidden");
    expect(diaAtivo?.style.background).toBe("var(--figaro-primary-container)");
    expect(diaAtivo?.style.color).toBe("var(--figaro-on-primary-container)");
    expect(horarioAtivo?.style.background).toBe("var(--figaro-tertiary)");
  });
});
