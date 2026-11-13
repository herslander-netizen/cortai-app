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
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
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
  const onFechar = vi.fn();
  act(() => root!.render(
    <ConfirmacaoAgendamento
      confirmacao={exemplo}
      situacao="confirmado"
      fuso="America/Sao_Paulo"
      onAlterar={onAlterar}
      onCancelar={onCancelar}
      onNovo={onNovo}
      onFechar={onFechar}
      extras={<section data-testid="extras"><h2>Preferências e comanda</h2></section>}
      {...props}
    />,
  ));
  const button = (label: string) => {
    const btn = Array.from(host!.querySelectorAll("button")).find((b) => b.textContent?.includes(label));
    expect(btn, `Botão não encontrado: ${label}`).toBeTruthy();
    return btn!;
  };
  return { button, onCancelar, onAlterar, onNovo, onFechar };
}

describe("Confirmação pública — resumo essencial do Figaroo e identidade do Flow", () => {
  it("prioriza quando, onde e serviço com fuso e valor reais, sem ticket redundante", () => {
    montar();
    expect(host?.textContent).toContain("Obrigado!");
    expect(host?.textContent).toContain("Confirmado!");
    expect(host?.textContent).toContain("Bella Rosa Studio de Beleza");
    expect(host?.textContent).toContain("Hidratação profunda");
    expect(host?.textContent).toContain("Marina Costa");
    expect(host?.textContent).toContain("sábado, 14 de novembro");
    expect(host?.textContent).toContain("14:00 – 15:00");
    expect(host?.textContent?.replace(/\u00a0/g, " ")).toContain("R$ 95,00");
    expect(host?.textContent).toContain("Rua das Acácias, 120");
    expect(Array.from(host!.querySelectorAll(".confirmacao-linha dt")).map((n) => n.textContent))
      .toEqual(["Quando", "Onde", "Serviço"]);
    expect(host?.querySelector(".chat-ingresso")).toBeNull();
    expect(host?.querySelector(".confirmacao-acao-principal")).toBeTruthy();
  });

  it("mostra só o essencial inicialmente, mas permite fechar e abrir calendário/gestão", () => {
    const { button, onAlterar, onNovo, onFechar } = montar();
    expect(host?.querySelector<HTMLAnchorElement>("a[href*='calendar.google.com']")).toBeNull();
    expect(host?.querySelector('[data-testid="extras"]')).toBeNull();
    act(() => button("Fechar").click());
    expect(onFechar).toHaveBeenCalledTimes(1);
    act(() => button("Mais opções").click());
    const link = host?.querySelector<HTMLAnchorElement>("a[href*='calendar.google.com']");
    expect(link?.textContent).toContain("Adicionar à agenda");
    expect(link?.getAttribute("rel")).toContain("noopener");
    expect(host?.textContent).toContain("Baixar arquivo .ics");
    act(() => button("Alterar agendamento").click());
    expect(onAlterar).toHaveBeenCalledTimes(1);
    act(() => button("Fazer outro agendamento").click());
    expect(onNovo).toHaveBeenCalledTimes(1);
  });

  it("esconde preferências/comanda por padrão, sem esconder ativação necessária de WhatsApp", () => {
    const { button } = montar({
      avisos: <section data-testid="aviso">Confirme seu telefone para receber avisos</section>,
    });
    expect(host?.querySelector('[data-testid="aviso"]')).toBeTruthy();
    expect(host?.querySelector('[data-testid="extras"]')).toBeNull();
    act(() => button("Detalhes e preferências").click());
    expect(host?.querySelector('[data-testid="extras"]')).toBeTruthy();
  });

  it("estado cancelado não oferece ações de confirmação e permite outra reserva", () => {
    const { button, onNovo } = montar({ situacao: "cancelado" });
    expect(host?.textContent).toContain("Agendamento cancelado");
    expect(host?.textContent).not.toContain("Obrigado!");
    expect(host?.textContent).not.toContain("Mais opções");
    expect(host?.textContent).not.toContain("Detalhes e preferências");
    act(() => button("Escolher outro horário").click());
    expect(onNovo).toHaveBeenCalledTimes(1);
  });

  it("respeita assinatura desativada e mostra instruções/erros reais", () => {
    montar({
      assinaturaVisivel: false,
      confirmacao: { ...exemplo, mensagemDoNegocio: "Chegue com cinco minutos de antecedência." },
      erro: "Não foi possível cancelar o agendamento.",
    });
    expect(host?.textContent).not.toContain("Agendado com Flow");
    expect(host?.textContent).toContain("Chegue com cinco minutos de antecedência.");
    expect(host?.querySelector('[role="alert"]')?.textContent).toContain("Não foi possível cancelar");
  });

  it("diferentes visuais preservam as mesmas ações e identidade do negócio", () => {
    const { button, onFechar } = montar({ visual: "figaro" });
    expect(host?.querySelector(".agendamento-confirmacao")?.getAttribute("data-visual")).toBe("figaro");
    act(() => button("Fechar").click());
    expect(onFechar).toHaveBeenCalledTimes(1);
    expect(host?.textContent).not.toContain("barbearia do");
  });
});
