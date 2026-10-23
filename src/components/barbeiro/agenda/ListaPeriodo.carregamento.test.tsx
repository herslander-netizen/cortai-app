// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const buscar = vi.hoisted(() => vi.fn());
vi.mock("@/lib/barbeiro.functions", async (original) => ({
  ...(await original<typeof import("@/lib/barbeiro.functions")>()),
  getAgendaPeriodo: buscar,
}));

import { ListaPeriodo } from "./ListaPeriodo";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const limpar: Array<() => void> = [];
const original = globalThis.IntersectionObserver;

beforeEach(() => {
  buscar.mockReset();
  // Um bloco de 60 dias por consulta, sem nenhum atendimento: a lista fica curta, cabe na tela.
  buscar.mockImplementation(({ data }: { data: { de: string; dias: number } }) => {
    const fim = new Date(Date.parse(`${data.de}T12:00:00Z`) + data.dias * 86_400_000);
    return Promise.resolve({
      de: data.de,
      ate: fim.toISOString().slice(0, 10),
      fuso: "America/Sao_Paulo",
      itens: [],
    });
  });
  // O fim da lista está sempre "visível": é o pior caso para o carregamento em cadeia.
  globalThis.IntersectionObserver = class {
    constructor(private aoCruzar: IntersectionObserverCallback) {}
    observe() {
      this.aoCruzar([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
    }
    disconnect() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  globalThis.IntersectionObserver = original;
  while (limpar.length) limpar.pop()?.();
});

describe("lista de períodos: carregamento", () => {
  it("não usa os pontinhos: eles são só da linha do tempo", () => {
    const fonte = readFileSync("src/components/barbeiro/agenda/ListaPeriodo.tsx", "utf8");
    expect(fonte).not.toContain("MarcaDoLimiteDoDia");
  });

  it("lista curta não busca bloco após bloco sozinha, e oferece Ver mais dias", async () => {
    const alvo = document.createElement("div");
    document.body.appendChild(alvo);
    const raiz = createRoot(alvo);
    limpar.push(() => act(() => raiz.unmount()));
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      raiz.render(
        createElement(
          QueryClientProvider,
          { client: cliente },
          createElement(ListaPeriodo, {
            hoje: "2099-10-09",
            fuso: "America/Sao_Paulo",
            profissionalId: null,
            mostrarProfissional: false,
            discreto: false,
            selecionado: null,
            onAbrir: () => {},
          }),
        ),
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // Só a primeira leitura (60 dias); nada de encadear até 365 dias.
    expect(buscar).toHaveBeenCalledTimes(1);
    const botao = [...alvo.querySelectorAll("button")].find((b) =>
      /Ver mais dias/.test(b.textContent ?? ""),
    );
    expect(botao).toBeDefined();
    await act(async () => {
      botao!.click();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(alvo.querySelector(".agenda-pontos")).toBeNull();
  });
});
