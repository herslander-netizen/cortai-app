// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CAPITULOS } from "./capitulos";
import { HistoriaAgenda, PASSOS_AGENDA } from "./HistoriaAgenda";
import { Celular } from "./Celular";

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
  it("desenha a primeira história antes de existir uma medida do ResizeObserver", () => {
    const html = renderToStaticMarkup(
      createElement(
        Celular,
        { legenda: createElement("span", null, "Seu site") },
        createElement("span", null, "Primeira cena visível"),
      ),
    );
    expect(html).toContain("Primeira cena visível");
    expect(html).toContain("Seu site");
    expect(html).not.toContain("opacity:0");
    expect(html).toContain("width:188px");
  });

  it("tem os capítulos na ordem da inspiração, cada um com frase de duas linhas", () => {
    expect(CAPITULOS.map((c) => c.id)).toEqual([
      "site",
      "agenda",
      "whatsapp",
      "lembretes",
      "fila",
      "gestao",
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

  it("cartão como no vídeo (tela + linha da marca + legenda); texto sobre foto usa tokens inversos", () => {
    const celular = readFileSync(`${PASTA}/Celular.tsx`, "utf8");
    const base = readFileSync(`${PASTA}/base.tsx`, "utf8");
    expect(celular).toContain("bg-[var(--figaro-inverse-surface)]");
    expect(celular).toContain("{legenda}");
    expect(celular).not.toContain("14:31");
    const icones = readFileSync("src/components/entrada/IconesDosCapitulos.tsx", "utf8");
    expect(icones).toContain("animate={{ opacity: aceso ? 0.75 : 0 }}");
    // A barrinha enche em CSS puro (o framer-motion a deixava cheia o tempo todo no celular).
    expect(icones).toContain("entrada-encher");
    expect(icones).toContain("linear forwards");
    expect(readFileSync("src/styles.css", "utf8")).toContain("@keyframes entrada-encher");
    expect(base).not.toMatch(/className="light /);
    // Texto sobre foto ou gradiente usa os tokens inversos (escuro/branco garantidos), nunca tinta/papel do palco.
    for (const f of arquivos) {
      expect(readFileSync(`${PASTA}/${f}`, "utf8"), f).not.toMatch(/var\(--(ink|paper)\)/);
    }
  });

  it("sem avaliações nem estrelas; o WhatsApp usa os textos reais do atendimento", () => {
    for (const f of arquivos) {
      const t = readFileSync(`${PASTA}/${f}`, "utf8");
      expect(t, f).not.toMatch(/★|Estrelas|HistoriaAvaliacoes|Nova avaliação/);
    }
    const zap = readFileSync(`${PASTA}/HistoriaWhatsapp.tsx`, "utf8");
    expect(zap).toContain("Qual serviço você quer?");
    expect(zap).toContain("Tenho estes horários livres:");
    expect(zap).toContain("Confira seu agendamento:");
    expect(zap).toContain("Responda *SIM* para confirmar ou *NÃO* para mudar.");
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
