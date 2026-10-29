// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AgendaItem } from "@/lib/barbeiro.functions";

import { ListaAgenda, type AcaoCard } from "./ListaAgenda";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

function item(extra: Partial<AgendaItem> = {}): AgendaItem {
  return {
    id: "a1",
    inicio: new Date(Date.now() + 30 * 60_000).toISOString(),
    fim: new Date(Date.now() + 60 * 60_000).toISOString(),
    status: "agendado",
    forma_pagamento: null,
    valor_centavos: 3000,
    clienteId: "c1",
    cliente: "Ana",
    telefone: null,
    ficha: null,
    servico: "Corte",
    duracaoMin: 30,
    profissional: "Bia",
    arrivedAt: null,
    startedAt: null,
    finishedAt: null,
    ...extra,
  };
}

function montar(
  itens: AgendaItem[],
  onAcao = vi.fn(),
  onFalta = vi.fn(),
  onAbrir = vi.fn(),
  ehHoje = false,
  mostrarProfissional = false,
  discreto = false,
) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root!.render(
      <ListaAgenda
        itens={itens}
        fuso="America/Sao_Paulo"
        ehHoje={ehHoje}
        selecionado={null}
        novos={new Set()}
        online
        mostrarProfissional={mostrarProfissional}
        discreto={discreto}
        onAbrir={onAbrir}
        onFalta={onFalta}
        onAcao={onAcao}
      />,
    ),
  );
  return { onAcao, onFalta, onAbrir };
}

function botao(texto: string) {
  const achado = Array.from(host?.querySelectorAll<HTMLButtonElement>("button") ?? []).find((b) =>
    b.textContent?.includes(texto),
  );
  expect(achado, `botão "${texto}" deveria existir`).toBeTruthy();
  return achado!;
}

describe("paridade Figaro dos cartões da Lista", () => {
  it("usa superfície neutra, barra de categoria, raio de 8 px e espaçamento de 10 px", () => {
    montar([item({ categoriaIndice: 2 })]);
    const lista = host!.querySelector("ul")!;
    const cartao = host!.querySelector<HTMLElement>(".agenda-item")!;
    const barra = cartao.querySelector<HTMLElement>(".pointer-events-none")!;
    const glifo = cartao.querySelector<HTMLElement>(".agenda-lista-glifo");

    expect(glifo).not.toBeNull();
    expect(glifo?.className).toContain("size-[17px]");
    expect(glifo?.style.color).toBeTruthy();
    expect(lista.className).toContain("space-y-2.5");
    expect((lista as HTMLElement).style.fontFamily).toBe("var(--figaro-font-body)");
    expect(lista.className).not.toContain("divide-y");
    expect(cartao.style.borderLeftWidth).toBe("0px");
    expect(cartao.style.borderLeftStyle).toBe("none");
    expect(cartao.style.borderRadius).toBe("8px");
    expect(cartao.style.backgroundColor).toContain("--agenda-cartao-evento");
    expect(barra.className).toContain("left-[6px]");
    expect(barra.className).toContain("top-[10px]");
    expect(barra.className).toContain("bottom-[10px]");
    expect(barra.className).toContain("w-1");
    expect(barra.className).toContain("rounded-full");
    expect(barra.style.backgroundColor).toBeTruthy();
    expect(host!.textContent).not.toContain("Toque no cartão para ver opções");
  });

  it("usa a escala tipográfica Figaro nas três linhas da Lista", () => {
    montar([item()]);
    const cartao = host!.querySelector<HTMLElement>(".agenda-item")!;
    const hora = cartao.querySelector("span.block.text-\\[14px\\]")!;
    const nome = cartao.querySelector(".agenda-nome")!;
    const servico = Array.from(cartao.querySelectorAll<HTMLElement>("span")).find((el) => el.className.includes("text-[12.5px]"))!;

    expect(hora.className).toContain("leading-[18px]");
    expect(hora.className).toContain("font-semibold");
    expect(nome.className).toContain("leading-[18px]");
    expect((nome as HTMLElement).style.fontWeight).toBe("600");
    expect(servico.className).toContain("leading-4");
  });
});

describe("ListaAgenda", () => {
  it.each([
    ["agendado", "Agendado", "Cliente chegou"],
    ["chegou", "Chegou", "Começar"],
    ["na_cadeira", null, "Finalizar e cobrar"],
  ])("cartão %s tem badge e ação principal", (status, badge, primaria) => {
    montar([item({ status })], vi.fn(), vi.fn(), vi.fn(), true);
    expect(host!.querySelector(`.agenda-item-${status}`)).not.toBeNull();
    if (badge) expect(host!.querySelector(".agenda-item-badge")?.textContent).toBe(badge);
    else expect(host!.querySelector(".agenda-item-badge-na_cadeira")).toBeNull();
    expect(botao(primaria)).toBeTruthy();
  });

  it.each([
    ["agendado", "chegou"],
    ["chegou", "iniciar"],
    ["na_cadeira", "terminar"],
  ] as Array<[string, AcaoCard]>)(
    "ação principal do cartão %s dispara %s sem abrir o cartão",
    (status, acao) => {
      const { onAcao, onAbrir } = montar([item({ status })], vi.fn(), vi.fn(), vi.fn(), true);
      const primaria = botao(
        { agendado: "Cliente chegou", chegou: "Começar", na_cadeira: "Finalizar e cobrar" }[
          status
        ]!,
      );
      act(() => primaria.click());
      expect(onAcao).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }), acao);
      expect(onAbrir).not.toHaveBeenCalled();
    },
  );

  it("estado finalizado não tem ação principal e abre o cartão ao clicar", () => {
    const { onAcao, onAbrir } = montar([item({ status: "finalizado" })]);
    expect(host!.querySelector(".agenda-item-primaria")).toBeNull();
    act(() => host!.querySelector<HTMLButtonElement>(".agenda-item-resumo")!.click());
    expect(onAcao).not.toHaveBeenCalled();
    expect(onAbrir).toHaveBeenCalledWith("a1");
  });

  it("usa um botão semântico para abrir o cartão e mantém as ações fora dele", () => {
    const { onAbrir } = montar([item({ status: "agendado" })], vi.fn(), vi.fn(), vi.fn(), true);
    const resumo = host!.querySelector<HTMLButtonElement>(".agenda-item-resumo")!;

    expect(host!.querySelector("li[role=button]")).toBeNull();
    expect(resumo.getAttribute("aria-pressed")).toBe("false");
    expect(resumo.querySelector("button")).toBeNull();
    expect(host!.querySelector(".agenda-item")?.querySelectorAll("button").length).toBeGreaterThan(
      1,
    );

    act(() => resumo.click());
    expect(onAbrir).toHaveBeenCalledWith("a1");
  });

  it("atrasado mostra aviso e dispara falta; aguardar encerra o aviso", () => {
    const atrasado = item({
      status: "agendado",
      inicio: new Date(Date.now() - 30 * 60_000).toISOString(),
    });
    const { onFalta } = montar([atrasado], vi.fn(), vi.fn(), vi.fn(), true);
    expect(host!.querySelector(".agenda-item-badge-atrasado")).not.toBeNull();
    act(() => botao("Faltou").click());
    expect(onFalta).toHaveBeenCalledWith(atrasado);
    act(() => botao("Aguardar").click());
    expect(host!.querySelector(".agenda-item-badge-atrasado")).toBeNull();
  });

  it("marca AGORA na cadeira e badge de encaixe", () => {
    montar([item({ status: "na_cadeira", encaixe: true })]);
    expect(host!.textContent).toContain("AGORA");
    expect(host!.querySelector(".agenda-item-badge-encaixe")).not.toBeNull();
  });

  it("mostra badge de confirmação para agendado confirmado", () => {
    montar([item({ status: "agendado", confirmadoEm: new Date().toISOString() })]);
    expect(host!.querySelector(".agenda-item-badge-confirmado")).not.toBeNull();
  });

  it("mantém somente uma ação primary", () => {
    montar([
      item({ id: "a1", status: "agendado" }),
      item({ id: "a2", status: "chegou" }),
      item({ id: "a3", status: "na_cadeira" }),
    ]);
    expect(host!.querySelectorAll("[class*='--botao-fundo']")).toHaveLength(1);
    expect(host!.querySelector(".agenda-item-na_cadeira [class*='--botao-fundo']")).not.toBeNull();
  });

  it("só mostra Cliente chegou nos 30 minutos anteriores", () => {
    montar(
      [item({ inicio: new Date(Date.now() + 31 * 60_000).toISOString() })],
      vi.fn(),
      vi.fn(),
      vi.fn(),
      true,
    );
    expect(host!.textContent).not.toContain("Cliente chegou");
  });

  it("troca as ações do atraso depois do fim", () => {
    montar(
      [
        item({
          inicio: new Date(Date.now() - 60 * 60_000).toISOString(),
          fim: new Date(Date.now() - 30 * 60_000).toISOString(),
        }),
      ],
      vi.fn(),
      vi.fn(),
      vi.fn(),
      true,
    );
    expect(host!.textContent).toContain("Atendi");
    expect(host!.textContent).toContain("Faltou");
    expect(host!.textContent).toContain("Remarcar");
    expect(host!.textContent).not.toContain("Aguardar");
  });

  it("recolhe encerrados somente hoje", () => {
    montar([item({ status: "finalizado" })], vi.fn(), vi.fn(), vi.fn(), true);
    expect(host!.querySelector(".agenda-item-finalizado")).toBeNull();
    expect(host!.textContent).toContain("Ver finalizados e cancelados (1)");
  });

  it("oculta profissional quando filtrado", () => {
    montar([item()], vi.fn(), vi.fn(), vi.fn(), false, false);
    expect(host!.textContent).not.toContain("Bia");
  });

  it("abrevia o nome no modo discreto e mantém Cliente avulso", () => {
    montar(
      [
        item({ id: "a1", cliente: "Herslander Jorge dos Santos" }),
        item({ id: "a2", cliente: "Cliente avulso" }),
        item({ id: "a3", cliente: "Madonna" }),
      ],
      vi.fn(),
      vi.fn(),
      vi.fn(),
      false,
      false,
      true,
    );
    expect(host!.textContent).toContain("Herslander J.");
    expect(host!.textContent).not.toContain("Herslander Jorge dos Santos");
    expect(host!.textContent).toContain("Cliente avulso");
    expect(host!.textContent).toContain("Madonna");
  });
});
