// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/barbeiro/AgendaTimeline", () => ({
  AgendaTimeline: ({ dia }: { dia: string }) => <div data-testid="timeline" data-dia={dia} />,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
  useQueryClient: () => ({ prefetchQuery: vi.fn() }),
}));
vi.mock("./useAgendaDia", () => ({ opcoesAgendaDia: (dia: string) => ({ queryKey: [dia] }) }));

import { CamadasVizinhas } from "./PreviaDiaVizinho";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const limpar: Array<() => void> = [];
afterEach(() => {
  while (limpar.length) limpar.pop()?.();
});

describe("CamadasVizinhas", () => {
  it("mostra o dia anterior e o seguinte e se atualiza na troca de dia", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const raiz = createRoot(host);
    limpar.push(() => {
      act(() => raiz.unmount());
      host.remove();
    });
    const desenhar = (diaAtual: string) =>
      act(async () => {
        raiz.render(
          createElement(CamadasVizinhas, { diaAtual, profissionalId: null, discreto: false }),
        );
      });
    const dias = () =>
      Array.from(host.querySelectorAll<HTMLElement>("[data-testid=timeline]")).map((e) =>
        e.getAttribute("data-dia"),
      );
    await desenhar("2026-10-23");
    expect(dias()).toEqual(["2026-10-22", "2026-10-24"]);
    await desenhar("2026-10-24");
    expect(dias()).toEqual(["2026-10-23", "2026-10-25"]);
  });
});
