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

window.matchMedia ??= ((q: string) => ({
  matches: false,
  media: q,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia;

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
});

/** Só a semana visível: a faixa guarda a anterior e a seguinte, fora da tela e inertes. */
const VISIVEIS = '[aria-label="Dias da semana"] > div > div:not([inert]) [aria-pressed]';

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

describe("medidas visuais Figaro no seletor de data", () => {
  it("fechando o mês, a semana fica por cima do painel (os dias não somem)", async () => {
    const fechado = await montar();
    const camada = (alvo: HTMLElement) =>
      alvo.querySelector<HTMLElement>('[aria-label="Dias da semana"]')?.parentElement;
    expect(camada(fechado)?.style.zIndex).toBe("20");
    const aberto = await montar({ expandido: true });
    expect(camada(aberto)?.style.zIndex).toBe("0");
  });

  it("usa círculo de 38 px e texto de 16 px na faixa da semana", async () => {
    const alvo = await montar();
    expect(alvo.querySelector<HTMLElement>("[data-sem-gesto-dia]")?.style.fontFamily).toBe("var(--figaro-font-body)");
    const selecionado = alvo.querySelector<HTMLButtonElement>(
      '[aria-label="Dias da semana"] button[aria-pressed="true"]',
    );
    const circulo = selecionado?.querySelector<HTMLElement>("span.grid");
    expect(circulo?.className).toContain("size-[38px]");
    expect(circulo?.className).toContain("text-base");
    expect(selecionado?.className).toContain("h-12");
    expect(selecionado?.querySelector('[aria-hidden="true"]')?.className).toContain("size-[5px]");
    const circuloDeslizante = alvo.querySelector<HTMLElement>(
      '[aria-label="Dias da semana"] .pointer-events-none',
    );
    expect(circuloDeslizante?.className).toContain("top-[5px]");
    expect(circuloDeslizante?.querySelector("i")?.className).toContain("size-[38px]");
    const rotulos = Array.from(alvo.querySelectorAll<HTMLElement>("div")).find((el) =>
      el.className.includes("text-[11.5px]"),
    );
    expect(rotulos?.textContent).toContain("D");
    expect(rotulos?.firstElementChild?.className).toContain("pb-2 pt-3");
  });

  it("usa título mensal 22/28 e círculo de 38 px com texto de 15 px", async () => {
    const alvo = await montar({ expandido: true });
    const titulo = alvo.querySelector<HTMLElement>('[data-mes="2026-10"] h2');
    expect(titulo?.className).toContain("text-[22px]");
    expect(titulo?.className).toContain("leading-7");
    expect(titulo?.className).toContain("font-bold");
    const selecionado = alvo.querySelector<HTMLElement>(
      '[aria-label="Calendário"] [aria-pressed="true"] span.grid',
    );
    expect(selecionado?.className).toContain("size-[38px]");
    expect(selecionado?.className).toContain("text-[15px]");
    expect(selecionado?.closest("button")?.className).toContain("h-10");
    expect(alvo.querySelector('[aria-label="Calendário"]')?.className).toContain("h-[286px]");
    expect(titulo?.className).toContain("pt-[13px]");
  });
});

describe("faixa da semana no topo", () => {
  it("mostra domingo a sábado da semana do dia, com o dia escolhido marcado", async () => {
    const alvo = await montar();
    const dias = Array.from(alvo.querySelectorAll<HTMLButtonElement>(VISIVEIS));
    expect(dias.map((d) => d.textContent)).toEqual(["4", "5", "6", "7", "8", "9", "10"]);
    expect(dias.find((d) => d.getAttribute("aria-pressed") === "true")?.textContent).toBe("9");
  });
  it("marca os dias com atendimento", async () => {
    const alvo = await montar();
    const comAtendimento = Array.from(alvo.querySelectorAll(VISIVEIS)).filter((d) =>
      d.getAttribute("aria-label")?.includes("com atendimentos"),
    );
    expect(comAtendimento.map((d) => d.textContent)).toEqual(["8", "9"]);
  });
  it("tocar num dia troca o dia", async () => {
    const onDia = vi.fn();
    const alvo = await montar({ onDia });
    const dia7 = Array.from(alvo.querySelectorAll<HTMLButtonElement>("[aria-pressed]")).find(
      (d) => d.textContent === "7",
    );
    act(() => dia7!.click());
    expect(onDia).toHaveBeenCalledWith("2026-10-07");
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
    const dias = Array.from(alvo.querySelectorAll(VISIVEIS)).map((d) => d.textContent);
    expect(dias).toEqual(["11", "12", "13", "14", "15", "16", "17"]);
    expect(onDia).not.toHaveBeenCalled();
  });
  it("aberto, mostra os meses com o dia escolhido marcado", async () => {
    const alvo = await montar({ expandido: true });
    // Abre com o mês do dia; os outros meses entram em fases, depois que as molas assentam.
    expect(alvo.textContent).toContain("Outubro");
    for (let i = 0; i < 40 && !alvo.textContent?.includes("Novembro"); i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 100));
      });
    }
    expect(alvo.textContent).toContain("Novembro");
    const marcado = alvo.querySelectorAll('[aria-label="Calendário"] [aria-pressed="true"]');
    expect(marcado).toHaveLength(1);
    expect(marcado[0]?.textContent).toBe("9");
  });
});
