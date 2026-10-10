// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => async () => ({ "2026-10-08": 2, "2026-10-09": 1 }),
}));
vi.mock("@/lib/barbeiro.functions", () => ({ getContagemDoMes: () => undefined }));

import { AlcaDoCalendario, SemanaDoTopo } from "./SemanaDoTopo";

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
          expandido: false,
          onExpandido: () => {},
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
  it("tocar num dia troca o dia; a alça abre o calendário", async () => {
    const onDia = vi.fn();
    const onExpandido = vi.fn();
    const alvo = await montar({ onDia });
    const alca = document.createElement("div");
    document.body.appendChild(alca);
    const raizAlca = createRoot(alca);
    limpar.push(() => act(() => raizAlca.unmount()));
    act(() => raizAlca.render(createElement(AlcaDoCalendario, { expandido: false, onExpandido })));
    const dia7 = Array.from(alvo.querySelectorAll<HTMLButtonElement>("[aria-pressed]")).find(
      (d) => d.textContent === "7",
    );
    act(() => dia7!.click());
    expect(onDia).toHaveBeenCalledWith("2026-10-07");
    act(() => alca.querySelector<HTMLButtonElement>('[aria-label="Abrir o calendário"]')!.click());
    expect(onExpandido).toHaveBeenCalledWith(true);
  });
  it("deslizar para a esquerda mostra a semana seguinte sem trocar o dia", async () => {
    const onDia = vi.fn();
    const alvo = await montar({ onDia });
    const faixa = alvo.querySelector<HTMLElement>('[aria-label="Dias da semana"]')!;
    const toque = (tipo: string, x: number) => {
      const e = new Event(tipo, { bubbles: true });
      Object.assign(e, {
        touches: tipo === "touchend" ? [] : [{ clientX: x, clientY: 100 }],
        changedTouches: [{ clientX: x, clientY: 100 }],
      });
      faixa.dispatchEvent(e);
    };
    act(() => {
      toque("touchstart", 300);
      toque("touchend", 200);
    });
    const dias = Array.from(alvo.querySelectorAll("[aria-pressed]")).map((d) => d.textContent);
    expect(dias).toEqual(["11", "12", "13", "14", "15", "16", "17"]);
    expect(onDia).not.toHaveBeenCalled();
  });
  it("aberto, mostra os meses com o dia escolhido marcado", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const alvo = await montar({ expandido: true });
    expect(alvo.textContent).toContain("Outubro");
    expect(alvo.textContent).toContain("Novembro");
    const marcado = alvo.querySelectorAll('[aria-pressed="true"]');
    expect(marcado).toHaveLength(1);
    expect(marcado[0]?.textContent).toBe("9");
  });
});
