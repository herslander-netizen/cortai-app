// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { SequenciaDaEntrada } from "./SequenciaDaEntrada";

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
});

describe("SequenciaDaEntrada", () => {
  it("mantém as cinco etapas acessíveis e permite escolher uma demonstração", async () => {
    const alvo = await montar();
    const abas = [...alvo.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

    expect(abas.length).toBe(5);
    expect(abas[0]?.getAttribute("aria-selected")).toBe("true");
    expect(alvo.querySelector("h2")?.textContent).toBe("Seu site pronto em minutos");

    const lembretes = abas.find((aba) => aba.textContent?.includes("Lembretes"));
    await act(async () => lembretes?.click());

    expect(lembretes?.getAttribute("aria-selected")).toBe("true");
    expect(alvo.querySelector("h2")?.textContent).toBe("Menos faltas, mais agenda cheia");
  });

  it("usa altura responsiva e mantém a demonstração com contraste", async () => {
    const alvo = await montar();
    const demo = alvo.querySelector<HTMLElement>(".entrada-cartao-demo");
    const legenda = alvo.querySelector<HTMLElement>(".entrada-cartao-legenda");
    const aparelho = alvo.querySelector<HTMLElement>(".entrada-demo");

    expect(demo?.style.height).toBe("clamp(128px, 25svh, 212px)");
    expect(legenda?.style.minHeight).toBe("0px");
    expect(aparelho?.getAttribute("style")).toContain("var(--identity-deep)");
    expect(alvo.querySelector(".entrada-cartao")?.getAttribute("style")).toContain("var(--ink2)");
  });
});
