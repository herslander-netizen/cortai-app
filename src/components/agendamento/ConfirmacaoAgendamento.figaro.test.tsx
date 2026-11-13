// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmacaoAgendamento } from "./ConfirmacaoAgendamento";
import type { ConfirmacaoPublica } from "@/lib/agendamento-publico.functions";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const exemplo: ConfirmacaoPublica = {
  agendamentoId: "00000000-0000-4000-8000-000000000001",
  preferenciasToken: "a".repeat(64),
  inicio: "2026-11-14T17:00:00.000Z",
  fim: "2026-11-14T18:00:00.000Z",
  cliente: "Cliente Exemplo",
  servico: "Hidratação profunda",
  profissional: "Marina Costa",
  barbearia: "Bella Rosa Studio de Beleza",
  endereco: "Rua das Acácias, 120 — Jardins, Aracaju/SE",
  whatsapp: null,
  valor_centavos: 9500,
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
  vi.restoreAllMocks();
});

function montar(props: Partial<Parameters<typeof ConfirmacaoAgendamento>[0]> = {}) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const onCancelar = vi.fn();
  const onAlterar = vi.fn();
  const onNovo = vi.fn();
  act(() => root!.render(
    <ConfirmacaoAgendamento
      confirmacao={exemplo}
      situacao="confirmado"
      fuso="America/Sao_Paulo"
      onAlterar={onAlterar}
      onCancelar={onCancelar}
      onNovo={onNovo}
      extras={<section data-testid="extras"><h2>Preferências e comanda</h2></section>}
      {...props}
    />,
  ));
  const button = (label: string) => {
    const btn = Array.from(host!.querySelectorAll("button")).find((b) => b.textContent?.includes(label));
    expect(btn, `Botão não encontrado: ${label}`).toBeTruthy();
    return btn!;
  };
  return { button, onCancelar, onAlterar, onNovo };
}

describe("Confirmação pública — estrutura Figaroo com identidade do Flow", () => {
  it("exibe todos os dados do agendamento no fuso do negócio", () => {
    montar();
    expect(host?.textContent).toContain("Horário garantido");
    expect(host?.textContent).toContain("Bella Rosa Studio de Beleza");
    expect(host?.textContent).toContain("Hidratação profunda");
    expect(host?.textContent).toContain("Marina Costa");
    expect(host?.textContent).toContain("sábado, 14 de novembro");
    expect(host?.textContent).toContain("14:00");
    expect(host?.textContent).toContain("R$ 95,00");
    expect(host?.textContent).toContain("Rua das Acácias, 120");
    expect(host?.querySelector(".confirmacao-hero")).toBeTruthy();
    expect(host?.querySelector(".confirmacao-ingresso")).toBeTruthy();
    expect(host?.querySelector(".confirmacao-acao-principal")).toBeTruthy();
  });

  it("preserva o link externo da agenda, extras, compartilhamento e ações de gestão", () => {
    const { button, onAlterar, onNovo } = montar();
    const link = host?.querySelector<HTMLAnchorElement>("a[href*='calendar.google.com']");
    expect(link?.textContent).toContain("Adicionar à agenda");
    expect(link?.getAttribute("rel")).toContain("noopener");
    expect(host?.querySelector('[data-testid="extras"]')).toBeTruthy();
    act(() => button("Mais formas de guardar e enviar").click());
    expect(host?.textContent).toContain("Baixar arquivo .ics");
    act(() => button("Gerenciar agendamento").click());
    act(() => button("Alterar agendamento").click());
    expect(onAlterar).toHaveBeenCalledTimes(1);
    act(() => button("Fazer outro agendamento").click());
    expect(onNovo).toHaveBeenCalledTimes(1);
  });

  it("estado cancelado não oferece agenda nem preferências e preserva nova reserva", () => {
    const { button, onNovo } = montar({ situacao: "cancelado" });
    expect(host?.textContent).toContain("Agendamento cancelado");
    expect(host?.textContent).not.toContain("Adicionar à agenda");
    expect(host?.textContent).not.toContain("Preferências e comanda");
    act(() => button("Escolher outro horário").click());
    expect(onNovo).toHaveBeenCalledTimes(1);
  });

  it("não expõe rodapé quando a assinatura é desativada pelo estabelecimento", () => {
    montar({ assinaturaVisivel: false });
    expect(host?.textContent).not.toContain("Agendado com Flow");
  });

  it("mantém mensagem opcional do negócio e erro visível", () => {
    montar({
      confirmacao: { ...exemplo, mensagemDoNegocio: "Chegue com cinco minutos de antecedência." },
      erro: "Não foi possível cancelar o agendamento.",
    });
    expect(host?.textContent).toContain("Chegue com cinco minutos de antecedência.");
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain("Não foi possível cancelar");
  });

  it("os elementos essenciais preservam ordem e navegação sem rótulos de barbearia fixos", () => {
    montar();
    const selectors = [
      ".confirmacao-topo",
      ".confirmacao-hero",
      ".confirmacao-ingresso",
      ".confirmacao-acao-principal",
      ".confirmacao-extras",
      ".confirmacao-secundarias",
      ".confirmacao-assinatura",
    ];
    const elements = selectors.map((selector) => host?.querySelector(selector));
    expect(elements.every(Boolean)).toBe(true);
    expect(elements.map((el) => [...host!.querySelectorAll("*")].indexOf(el!)))
      .toEqual([...elements.map((el) => [...host!.querySelectorAll("*")].indexOf(el!))].sort((a, b) => a - b));
    expect(host?.textContent).not.toContain("barbearia do");
  });
});
