// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publicar = vi.hoisted(() => vi.fn());
vi.mock("./pilula-agora", async (original) => ({
  ...(await original<typeof import("./pilula-agora")>()),
  publicarAgora: publicar,
}));

import { PreviaDiaVizinho } from "./PreviaDiaVizinho";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const FUSO = "America/Sao_Paulo";
const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());

let host: HTMLDivElement | null = null;
let root: Root | null = null;
beforeEach(() => {
  publicar.mockClear();
  window.matchMedia = ((q: string) => ({
    matches: true,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

function montar(visualizacao: "lista" | "timeline") {
  const cliente = new QueryClient();
  cliente.setQueryData(["agenda-dia", hoje], {
    fuso: FUSO,
    horarios: [],
    itens: [
      {
        id: "a1",
        inicio: new Date(Date.now() + 30 * 60_000).toISOString(),
        fim: new Date(Date.now() + 60 * 60_000).toISOString(),
        status: "agendado",
        cliente: "Ana",
        servico: "Corte",
        profissional: "Bia",
        profissionalId: "p1",
        arrivedAt: null,
        startedAt: null,
        finishedAt: null,
      },
    ],
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root!.render(
      <QueryClientProvider client={cliente}>
        <PreviaDiaVizinho
          dia={hoje}
          visualizacao={visualizacao}
          profissionalId={null}
          discreto={false}
        />
      </QueryClientProvider>,
    ),
  );
  return host;
}

describe("PreviaDiaVizinho", () => {
  it("na Timeline desenha a timeline, não a lista, sem mexer na cápsula Agora", () => {
    const el = montar("timeline");
    expect(el.querySelector(".agenda-timeline")).not.toBeNull();
    expect(el.querySelector("ul")).toBeNull();
    expect(el.querySelector(".agenda-timeline-previa")?.getAttribute("aria-hidden")).toBe("true");
    expect(publicar).not.toHaveBeenCalled();
  });

  it("na Lista desenha a lista", () => {
    const el = montar("lista");
    expect(el.querySelector("ul li")?.textContent).toContain("Ana");
    expect(el.querySelector(".agenda-timeline")).toBeNull();
  });
});
