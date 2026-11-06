// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CAPITULOS } from "./capitulos";
import { HistoriaAgenda, PASSOS_AGENDA } from "./HistoriaAgenda";

const movimento = vi.hoisted(() => ({ reduzido: false }));

vi.mock("framer-motion", async (importOriginal) => {
  const original = await importOriginal<typeof import("framer-motion")>();
  return { ...original, useReducedMotion: () => movimento.reduzido };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

let host: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

async function montarAgenda() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root?.render(createElement(HistoriaAgenda)));
  return host;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  movimento.reduzido = false;
  vi.useRealTimers();
});

const PASTA = "src/components/entrada/historias";
const arquivos = readdirSync(PASTA).filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"));

describe("mini-histórias da entrada (vídeo de referência do dono, 06/11)", () => {
  it("tem os cinco capítulos na ordem da referência, cada um com frase de duas linhas", () => {
    expect(CAPITULOS.map((c) => c.id)).toEqual([
      "site",
      "agenda",
      "lembretes",
      "avaliacoes",
      "desempenho",
    ]);
    for (const c of CAPITULOS) {
      expect(c.frase.split("\n"), c.id).toHaveLength(2);
      expect(c.duracao, c.id).toBeGreaterThan(3000);
    }
  });

  it("usa só tokens, linguagem neutra e arquivos com até 300 linhas", () => {
    for (const f of arquivos) {
      const t = readFileSync(`${PASTA}/${f}`, "utf8");
      expect(t, f).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(t, f).not.toMatch(/barbearia|barbeiro|tesoura|pente/i);
      expect(t.split("\n").length, f).toBeLessThanOrEqual(300);
    }
  });

  it("se identifica como exemplo para leitores de tela", () => {
    const base = readFileSync(`${PASTA}/base.tsx`, "utf8");
    expect(base).toContain("Exemplo visual:");
    expect(base).toContain("Nomes e números ilustrativos.");
  });

  it("anda pelos passos sozinha até o agendamento confirmado", async () => {
    vi.useFakeTimers();
    const alvo = await montarAgenda();
    expect(alvo.textContent).toContain("Novembro, 2026");
    expect(alvo.textContent).not.toContain("Agendamento confirmado");
    for (const d of PASSOS_AGENDA.slice(0, -1)) {
      await act(async () => {
        vi.advanceTimersByTime(d);
      });
    }
    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(alvo.textContent).toContain("Agendamento confirmado");
  });

  it("com movimento reduzido fica parada no passo final", async () => {
    movimento.reduzido = true;
    const alvo = await montarAgenda();
    expect(alvo.textContent).toContain("Agendamento confirmado");
  });
});
