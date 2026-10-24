// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({ useServerFn: () => vi.fn() }));
vi.mock("@/lib/assistente.functions", () => ({ interpretarHorarios: vi.fn() }));

import { EditorDeHorarios } from "./EditorDeHorarios";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let mounted: Array<{ host: HTMLDivElement; root: ReturnType<typeof createRoot> }> = [];

async function montar(element: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  mounted.push({ host, root });
  await act(async () => root.render(element));
  return host;
}

afterEach(async () => {
  await act(async () => {
    for (const item of mounted.splice(0)) item.root.unmount();
  });
  document.body.replaceChildren();
});

describe("EditorDeHorarios", () => {
  it("recolhe e reabre a disponibilidade semanal sem remover os valores", async () => {
    const onChange = vi.fn();
    const host = await montar(
      createElement(EditorDeHorarios, {
        horarios: [
          {
            diaSemana: 1,
            fechado: false,
            abre: "09:00",
            fecha: "17:00",
            intervaloInicio: null,
            intervaloFim: null,
          },
        ],
        onChange,
        semIA: true,
        segmento: "barbearia",
      }),
    );
    const toggle = host.querySelector('button[aria-expanded="true"]') as HTMLButtonElement;
    expect(toggle.textContent).toContain("Disponibilidade semanal");
    expect(host.querySelector('input[type="time"][aria-label="Segunda abre"]')).not.toBeNull();

    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector('[aria-hidden="true"][inert]')).not.toBeNull();

    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelector('input[type="time"][aria-label="Segunda abre"]')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
