// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => async () => ({ "2026-10-08": 2, "2026-10-09": 1 }),
}));
vi.mock("@/lib/barbeiro.functions", () => ({ getContagemDoMes: () => undefined }));

import { SemanaDoTopo } from "./SemanaDoTopo";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
});

async function montar(props: Partial<Parameters<typeof SemanaDoTopo>[0]> = {}) {
  const alvo = document.createElement("div");
  document.body.appendChild(alvo);
  const raiz = createRoot(alvo);
  limpar.push(() => act(() => raiz.unmount()));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    raiz.render(
      createElement(
        QueryClientProvider,
        { client: qc },
        createElement(SemanaDoTopo, {
          dia: "2026-10-09",
          hoje: "2026-10-09",
          profissionalId: null,
          onDia: () => {},
          onAbrirMes: () => {},
          ...props,
        }),
      ),
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return alvo;
}

describe("faixa da semana no topo", () => {
  it("mostra domingo a sábado da semana do dia, com o dia escolhido marcado", async () => {
    const alvo = await montar();
    const dias = Array.from(alvo.querySelectorAll<HTMLButtonElement>("[aria-pressed]"));
    expect(dias.map((d) => d.textContent)).toEqual(["4", "5", "6", "7", "8", "9", "10"]);
    expect(dias.find((d) => d.getAttribute("aria-pressed") === "true")?.textContent).toBe("9");
  });
  it("marca os dias com atendimento", async () => {
    const alvo = await montar();
    const comAtendimento = Array.from(alvo.querySelectorAll("[aria-pressed]")).filter((d) =>
      d.getAttribute("aria-label")?.includes("com atendimentos"),
    );
    expect(comAtendimento.map((d) => d.textContent)).toEqual(["8", "9"]);
  });
  it("tocar num dia troca o dia; a alça abre o mês", async () => {
    const onDia = vi.fn();
    const onAbrirMes = vi.fn();
    const alvo = await montar({ onDia, onAbrirMes });
    const dia7 = Array.from(alvo.querySelectorAll<HTMLButtonElement>("[aria-pressed]")).find(
      (d) => d.textContent === "7",
    );
    act(() => dia7!.click());
    expect(onDia).toHaveBeenCalledWith("2026-10-07");
    act(() => alvo.querySelector<HTMLButtonElement>('[aria-label="Abrir o mês"]')!.click());
    expect(onAbrirMes).toHaveBeenCalled();
  });
});
