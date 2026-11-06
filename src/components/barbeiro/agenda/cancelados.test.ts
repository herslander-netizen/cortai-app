import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { mostrarCanceladosInicial, salvarMostrarCancelados } from "./preferencias";

/** Cancelados escondidos nos dois modos da Agenda (dono, 06/11/2026). */
function memoria() {
  const dados = new Map<string, string>();
  return {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => void dados.set(k, v),
  };
}

describe("cancelados na Agenda", () => {
  it("escondidos por padrão e lembrados no aparelho", () => {
    const armazenamento = memoria();
    expect(mostrarCanceladosInicial(armazenamento)).toBe(false);
    salvarMostrarCancelados(true, armazenamento);
    expect(mostrarCanceladosInicial(armazenamento)).toBe(true);
    salvarMostrarCancelados(false, armazenamento);
    expect(mostrarCanceladosInicial(armazenamento)).toBe(false);
  });

  it("lista e linha do tempo leem a mesma preferência; só a grade muda", () => {
    const operacional = readFileSync("src/components/barbeiro/AgendaOperacional.tsx", "utf8");
    const lista = readFileSync("src/components/barbeiro/agenda/ListaPeriodo.tsx", "utf8");
    expect(lista).toContain("useMostrarCancelados()");
    expect(operacional).toContain("const [mostrarCancelados] = useMostrarCancelados();");
    expect(operacional).toContain("!INATIVOS.has(item.status) || item.id === selecionado");
    expect(operacional).toContain("itens={itensDaGrade}");
    // O resumo do dia continua contando todos (não esconde números).
    expect(operacional).toMatch(/<ResumoDia\s+itens=\{itens\}/);
  });
});
