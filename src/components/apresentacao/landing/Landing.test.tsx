// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { APRESENTACAO_PADRAO } from "@/lib/apresentacao-conteudo";
import { PLANOS_COMERCIAIS } from "@/lib/planos-comerciais";
import { GRUPOS_DE_FUNCIONALIDADES } from "@/lib/funcionalidades";
import { linkDeInteresseFlow } from "./whatsapp";

vi.mock("@/lib/institucional.functions", () => ({
  getContatoDaPlataforma: async () => ({ whatsapp: null }),
}));

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
  act(() =>
    raiz.render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(Landing, { conteudo }),
      ),
    ),
  );
  return { div, fechar: () => act(() => raiz.unmount()) };
}

describe("página pública promocional", () => {
  it("destaca a oferta grátis com o limite real do plano Essencial", () => {
    const { div, fechar } = desenhar();
    const essencial = PLANOS_COMERCIAIS.find((p) => p.chave === "essencial")!;
    expect(div.textContent).toContain(
      `Grátis até ${essencial.agendamentosMes} agendamentos por mês.`,
    );
    expect(div.querySelectorAll('a[href^="https://wa.me/5579998181983?text="]').length).toBeGreaterThan(4);
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

  it("termina com o rodapé padrão (Alvo Digital, privacidade e direitos)", () => {
    const { div, fechar } = desenhar();
    expect(div.textContent).toContain("Alvo Digital");
    expect(div.textContent).toContain("Privacidade");
    expect(div.querySelector('a[href="/termos"]')).not.toBeNull();
    expect(div.querySelector('a[href="/cookies"]')).not.toBeNull();
    expect(div.textContent).toContain("© 2026 Herslander");
    fechar();
  });

  it("direciona todas as chamadas comerciais ao WhatsApp e não exibe login ou cadastro", () => {
    const { div, fechar } = desenhar();
    const linksComerciais = [...div.querySelectorAll("a[data-cta-propria]")];
    expect(linksComerciais).toHaveLength(PLANOS_COMERCIAIS.length + 3);
    for (const link of linksComerciais) {
      const destino = new URL(link.getAttribute("href") ?? "");
      expect(destino.hostname).toBe("wa.me");
      expect(destino.pathname).toBe("/5579998181983");
      expect(destino.searchParams.get("text")).toMatch(/interesse.*Flow|Flow.*interesse/i);
      expect(link.getAttribute("target")).toBe("_blank");
    }

    expect(div.querySelector('a[href="/login"], a[href="/comecar"], a[href="/"]')).toBeNull();
    expect(div.textContent).not.toContain("Já tenho conta");
    expect(div.textContent).not.toContain("Abrir meu painel");
    const flutuante = div.querySelector('a[aria-label="Conversar sobre o Flow no WhatsApp"]');
    expect(flutuante?.getAttribute("href")).toBe(linkDeInteresseFlow());
    expect(div.querySelector('header a[href^="https://wa.me/"]')).toBeNull();
    expect(div.querySelector('header button[aria-label="Abrir menu de funcionalidades"]')).not.toBeNull();
    expect(div.querySelector('a[href="/privacidade"]')).not.toBeNull();
    fechar();
  });


  it("oferece todos os recursos reais no menu e no catálogo, sem inventar rotas", () => {
    const { div, fechar } = desenhar();
    const botao = div.querySelector<HTMLButtonElement>(
      'header button[aria-label="Abrir menu de funcionalidades"]',
    );
    expect(botao?.getAttribute("aria-expanded")).toBe("false");
    act(() => botao?.click());
    expect(div.querySelector('header button[aria-expanded="true"]')).not.toBeNull();

    const menu = div.querySelector("#menu-completo-flow");
    const recursos = GRUPOS_DE_FUNCIONALIDADES.flatMap((grupo) => grupo.itens);
    const links = [...(menu?.querySelectorAll('a[href^="#recurso-"]') ?? [])];
    expect(links).toHaveLength(recursos.length);
    for (const item of recursos) {
      expect(menu?.querySelector(`a[href="#recurso-${item.chave}"]`)).not.toBeNull();
      expect(div.querySelector(`#recurso-${item.chave}`)?.textContent).toContain(item.rotulo);
    }
    for (const id of ["como-funciona", "funcionalidades", "planos", "perguntas"]) {
      expect(menu?.querySelector(`a[href="#${id}"]`)).not.toBeNull();
      expect(div.querySelector(`#${id}`)).not.toBeNull();
    }
    for (const grupo of GRUPOS_DE_FUNCIONALIDADES) {
      expect(menu?.textContent).toContain(grupo.titulo);
    }

    act(() => links[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(div.querySelector("#menu-completo-flow")).toBeNull();
    expect(div.querySelector('header button[aria-expanded="false"]')).not.toBeNull();
    fechar();
  });

  it("permite fechar o menu ao pressionar Escape", () => {
    const { div, fechar } = desenhar();
    act(() => div.querySelector<HTMLButtonElement>('header button[aria-expanded="false"]')?.click());
    expect(div.querySelector("#menu-completo-flow")).not.toBeNull();
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(div.querySelector("#menu-completo-flow")).toBeNull();
    fechar();
  });

  it("preenche o interesse geral ou no plano sem enviar mensagens automaticamente", () => {
    const geral = new URL(linkDeInteresseFlow());
    expect(geral.hostname).toBe("wa.me");
    expect(geral.pathname).toBe("/5579998181983");
    expect(geral.searchParams.get("text")).toContain("Tenho interesse no Flow");
    const studio = new URL(linkDeInteresseFlow("Studio"));
    expect(studio.searchParams.get("text")).toContain("Tenho interesse no plano Studio");
  });

  it("não cita plano nem limite antigos nos textos padrão", () => {
    expect(JSON.stringify(APRESENTACAO_PADRAO)).not.toMatch(/Conecta|40 agendamentos/);
  });
});
