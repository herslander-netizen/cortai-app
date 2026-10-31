import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { AgendaItem } from "@/lib/barbeiro.functions";

import { agruparPorDia, correspondeABusca, tituloDoDia } from "./ListaPeriodo";

const item = (id: string, inicio: string, extra: Partial<AgendaItem> = {}): AgendaItem => ({
  id,
  inicio,
  fim: inicio,
  status: "agendado",
  forma_pagamento: null,
  valor_centavos: 5000,
  clienteId: null,
  cliente: "João Ávila",
  telefone: "(11) 98765-4321",
  ficha: null,
  servico: "Corte degradê",
  duracaoMin: 30,
  profissional: "Bruno",
  arrivedAt: null,
  startedAt: null,
  finishedAt: null,
  ...extra,
});

describe("lista de vários dias", () => {
  it("separa por dia no fuso do negócio e põe em ordem de horário", () => {
    const grupos = agruparPorDia(
      [
        item("b", "2026-10-24T13:00:00Z"),
        item("a", "2026-10-23T15:00:00Z"),
        // 23h30 de 23/10 em São Paulo é 02h30 UTC do dia 24.
        item("c", "2026-10-24T02:30:00Z"),
      ],
      "America/Sao_Paulo",
    );
    expect(grupos.map((g) => [g.dia, g.itens.map((i) => i.id)])).toEqual([
      ["2026-10-23", ["a", "c"]],
      ["2026-10-24", ["b"]],
    ]);
  });

  it("mostra o mês por extenso no cabeçalho de cada dia", () => {
    expect(tituloDoDia("2026-10-21").curto).toBe("21 de outubro");
    expect(tituloDoDia("2026-10-28").curto).toBe("28 de outubro");
  });

  it("busca por cliente sem acento, telefone só com números e serviço", () => {
    const i = item("a", "2026-10-23T15:00:00Z");
    expect(correspondeABusca(i, "joao avila")).toBe(true);
    expect(correspondeABusca(i, "98765")).toBe(true);
    expect(correspondeABusca(i, "DEGRADE")).toBe(true);
    expect(correspondeABusca(i, "bruno")).toBe(true);
    expect(correspondeABusca(i, "maria")).toBe(false);
    expect(correspondeABusca(i, "  ")).toBe(true);
  });
});

describe("modo lista no celular", () => {
  const ler = (p: string) => require("node:fs").readFileSync(p, "utf8") as string;
  const operacional = ler("src/components/barbeiro/AgendaOperacional.tsx");
  const lista = ler("src/components/barbeiro/agenda/ListaPeriodo.tsx");

  it("o celular usa a lista de vários dias; o computador mantém a lista do dia", () => {
    expect(operacional).toMatch(/\) : celular \? \(\s*<ListaPeriodo/);
    expect(operacional).toContain("<ListaAgenda");
  });

  it("a faixa da semana recolhe e a troca de visualização anima, sem animar a troca de dia", () => {
    expect(operacional).toContain('<RecolheNaLista visivel={visualizacao !== "lista"}>');
    expect(operacional).toContain(
      'chave={celular && visualizacao === "lista" ? "lista" : "grade"}',
    );
  });

  it("cancelados continuam recolhidos e os cartões não mostram ações inline", () => {
    expect(lista).toContain("Mostrar cancelados");
    expect(lista).not.toContain("<AcoesDoItem");
    expect(lista).toContain("Toque no cartão para ver opções, remarcar ou cancelar");
  });

  it("o marcador Hoje é o selo azul do Figaro (par actionBlue/onActionBlue, contraste nos dois temas)", () => {
    expect(lista).toContain("<span data-hoje>Hoje</span>");
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toMatch(
      /\.agenda-lista-dia-titulo \[data-hoje\] \{[^}]*background: var\(--figaro-action-blue[^}]*color: var\(--figaro-on-action-blue/,
    );
  });

  it("dias vazios entre hoje e o último dia aparecem como Livre / Nada marcado (Figaro)", () => {
    expect(lista).toContain('"Livre"');
    expect(lista).toContain("Nada marcado");
    expect(lista).toContain("diasDaLista(");
  });
});

describe("dias da lista (Figaro: todos os dias de hoje até o último com atendimento)", () => {
  it("preenche os dias vazios do meio e não inventa dias depois do último", async () => {
    const { diasDaLista } = await import("./ListaPeriodo");
    const a = item("a", "2026-10-30T13:00:00.000Z");
    const dias = diasDaLista([{ dia: "2026-10-31", itens: [a] }], "2026-10-29", false);
    expect(dias.map((d) => [d.dia, d.itens.length])).toEqual([
      ["2026-10-29", 0],
      ["2026-10-30", 0],
      ["2026-10-31", 1],
    ]);
    // Com busca, só os dias que têm resultado.
    expect(diasDaLista([{ dia: "2026-10-31", itens: [a] }], "2026-10-29", true)).toHaveLength(1);
  });

  it("como na foto do Figaro: começa no primeiro dia com atendimento desta semana e chega até hoje", async () => {
    const { diasDaLista, inicioDaSemana } = await import("./ListaPeriodo");
    const a = item("a", "2026-10-28T13:00:00.000Z");
    const b = item("b", "2026-10-30T16:00:00.000Z");
    const dias = diasDaLista(
      [
        { dia: "2026-10-28", itens: [a] },
        { dia: "2026-10-30", itens: [b] },
      ],
      "2026-10-31",
      false,
    );
    expect(dias.map((d) => [d.dia, d.itens.length])).toEqual([
      ["2026-10-28", 1],
      ["2026-10-29", 0],
      ["2026-10-30", 1],
      ["2026-10-31", 0],
    ]);
    // A busca da lista começa no domingo da semana (31/10/2026 é sábado).
    expect(inicioDaSemana("2026-10-31")).toBe("2026-10-25");
    expect(inicioDaSemana("2026-10-25")).toBe("2026-10-25");
  });
});
