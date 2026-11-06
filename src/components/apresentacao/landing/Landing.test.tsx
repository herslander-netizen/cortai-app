// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { APRESENTACAO_PADRAO } from "@/lib/apresentacao-conteudo";
import { PLANOS_COMERCIAIS } from "@/lib/planos-comerciais";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    createElement("a", { href: to }, children),
}));

import { Landing } from "./Landing";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
globalThis.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

function desenhar(conteudo = APRESENTACAO_PADRAO) {
  const div = document.createElement("div");
  document.body.append(div);
  const raiz = createRoot(div);
  act(() => raiz.render(createElement(Landing, { conteudo })));
  return { div, fechar: () => act(() => raiz.unmount()) };
}

describe("página pública promocional", () => {
  it("destaca a oferta grátis com o limite real do plano Essencial", () => {
    const { div, fechar } = desenhar();
    const essencial = PLANOS_COMERCIAIS.find((p) => p.chave === "essencial")!;
    expect(div.textContent).toContain(
      `Grátis até ${essencial.agendamentosMes} agendamentos por mês.`,
    );
    expect(div.querySelectorAll('a[href="/comecar"]').length).toBeGreaterThan(2);
    fechar();
  });

  it("mostra um cartão por plano da vitrine e as perguntas editáveis", () => {
    const { div, fechar } = desenhar({
      ...APRESENTACAO_PADRAO,
      perguntas: [{ pergunta: "Pergunta de teste", resposta: "Resposta." }],
    });
    const titulos = [...div.querySelectorAll("h3")].map((h) => h.textContent);
    for (const plano of PLANOS_COMERCIAIS) expect(titulos).toContain(plano.nome);
    expect(div.textContent).toContain("Pergunta de teste");
    fechar();
  });

  it("não cita plano nem limite antigos nos textos padrão", () => {
    expect(JSON.stringify(APRESENTACAO_PADRAO)).not.toMatch(/Conecta|40 agendamentos/);
  });
});
