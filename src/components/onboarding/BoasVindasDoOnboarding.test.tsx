// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BoasVindasDoOnboarding } from "./BoasVindasDoOnboarding";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
          const filtered = Object.fromEntries(
            Object.entries(props).filter(([key]) =>
              !["initial", "animate", "exit", "transition", "layout"].includes(key),
            ),
          );
          return React.createElement(
            tag as any,
            { ...filtered, ref } as any,
            props["children"] as ReactNode,
          );
        }),
    },
  );
  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion,
    useReducedMotion: () => false,
  };
});

vi.mock("@/components/marca/MarcaFlow", () => ({
  MarcaFlow: () => createElement("span", { "aria-label": "Marca Flow" }, "Flow"),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montar(indicePersistido = 0) {
  const handlers = {
    onAbrirPasso: vi.fn(),
    onContinuar: vi.fn(),
    onDepois: vi.fn(),
  };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () =>
    root?.render(
      createElement(BoasVindasDoOnboarding, {
        indicePersistido,
        continuarLabel: indicePersistido > 0 ? "Continuar configuração" : "Começar configuração",
        ...handlers,
      }),
    ),
  );
  return { host, handlers };
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
});

describe("BoasVindasDoOnboarding", () => {
  it("mostra os três passos, bloqueia os futuros e encaminha as ações", async () => {
    const { host: alvo, handlers } = await montar(0);

    expect(alvo.querySelector("h1")?.textContent).toBe("Bem-vindo ao");
    expect(alvo.textContent).toContain("3 PASSOS");
    expect(alvo.textContent).toContain("Definir seu espaço");
    expect(alvo.textContent).toContain("Adicionar equipe");
    expect(alvo.textContent).toContain("Configurar serviços");
    expect(alvo.textContent).toContain("Etapa atual");
    expect(alvo.textContent).toContain("Não iniciado");

    const equipe = [...alvo.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Adicionar equipe"),
    );
    expect(equipe?.disabled).toBe(true);

    const primeiro = [...alvo.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Definir seu espaço"),
    );
    await act(async () => primeiro?.click());
    expect(handlers.onAbrirPasso).toHaveBeenCalledWith("dados");

    const continuar = [...alvo.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Começar configuração"),
    );
    await act(async () => continuar?.click());
    expect(handlers.onContinuar).toHaveBeenCalledTimes(1);

    const depois = [...alvo.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Fazer isso depois"),
    );
    await act(async () => depois?.click());
    expect(handlers.onDepois).toHaveBeenCalledTimes(1);
  });

  it("retoma o progresso salvo e libera as etapas já alcançadas", async () => {
    const { host: alvo } = await montar(2);

    const espaco = [...alvo.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Definir seu espaço"),
    );
    const equipe = [...alvo.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Adicionar equipe"),
    );
    const servicos = [...alvo.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Configurar serviços"),
    );

    expect(espaco?.disabled).toBe(false);
    expect(equipe?.disabled).toBe(false);
    expect(servicos?.disabled).toBe(false);
    expect(espaco?.textContent).toContain("Concluído");
    expect(equipe?.textContent).toContain("Concluído");
    expect(servicos?.getAttribute("aria-current")).toBe("step");
    expect(alvo.textContent).toContain("Continuar configuração");
  });
});
