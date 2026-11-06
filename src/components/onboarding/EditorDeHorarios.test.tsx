// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorDeHorarios } from "./EditorDeHorarios";

vi.mock("@tanstack/react-start", () => ({ useServerFn: () => vi.fn() }));
vi.mock("@/lib/assistente.functions", () => ({ interpretarHorarios: vi.fn() }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mounted: Array<{ host: HTMLDivElement; root: ReturnType<typeof createRoot> }> = [];

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
  it("mostra o dia em linha de grupo: interruptor, chips de horário e intervalo por chip (sem input de hora)", async () => {
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
    expect(host.textContent).toContain("Disponibilidade semanal");
    expect(host.querySelector('input[type="time"]')).toBeNull();
    expect(host.querySelector('[role="switch"]')?.getAttribute("aria-checked")).toBe("true");
    const chips = [...host.querySelectorAll('[data-slot="chip"]')].map((c) =>
      c.textContent?.trim(),
    );
    expect(chips).toEqual(["09:00", "17:00", "Intervalo"]);

    const intervalo = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Intervalo",
    )!;
    await act(async () => intervalo.click());
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ diaSemana: 1, intervaloInicio: "12:00", intervaloFim: "13:00" }),
    ]);

    const interruptor = host.querySelector('[role="switch"]') as HTMLButtonElement;
    await act(async () => interruptor.click());
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ fechado: true })]);
  });
});
