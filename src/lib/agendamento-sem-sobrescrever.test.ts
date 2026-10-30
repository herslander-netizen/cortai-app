import { describe, expect, it } from "vitest";

import { gravarHorarioSemSobrescrever } from "./agendamento-sem-sobrescrever";

/** Banco falso: guarda os filtros do UPDATE e devolve as linhas que o teste mandar. */
function bancoFalso(
  linhas: { id: string }[] | null,
  error: { code?: string; message: string } | null = null,
) {
  const filtros: [string, string, unknown][] = [];
  let mudancas: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- encadeamento falso do cliente Supabase
  const consulta: any = {
    update(m: unknown) {
      mudancas = m;
      return consulta;
    },
    eq(coluna: string, valor: unknown) {
      filtros.push(["eq", coluna, valor]);
      return consulta;
    },
    in(coluna: string, valor: unknown) {
      filtros.push(["in", coluna, valor]);
      return consulta;
    },
    select: async () => ({ data: linhas, error }),
  };
  return { db: { from: () => consulta }, filtros, mudancas: () => mudancas };
}

const visto = { id: "a1", inicio: "2026-11-02T13:00:00+00:00", fim: "2026-11-02T13:30:00+00:00" };

describe("gravarHorarioSemSobrescrever", () => {
  it("só grava se início, fim e status ainda forem os que a tela viu", async () => {
    const b = bancoFalso([{ id: "a1" }]);
    const r = await gravarHorarioSemSobrescrever(b.db, "t1", visto, { inicio: "x", fim: "y" });
    expect(r).toEqual({ error: null, mudou: false });
    expect(b.filtros).toEqual([
      ["eq", "id", "a1"],
      ["eq", "tenant_id", "t1"],
      ["eq", "inicio", visto.inicio],
      ["eq", "fim", visto.fim],
      ["in", "status", ["agendado", "chegou"]],
    ]);
    expect(b.mudancas()).toEqual({ inicio: "x", fim: "y" });
  });

  it("acusa mudança quando outra pessoa gravou antes (nenhuma linha alterada)", async () => {
    const r = await gravarHorarioSemSobrescrever(bancoFalso([]).db, "t1", visto, {});
    expect(r.mudou).toBe(true);
  });

  it("repassa o erro do banco (ex.: sobreposição)", async () => {
    const erro = { code: "23P01", message: "agendamentos_sem_sobreposicao" };
    const r = await gravarHorarioSemSobrescrever(bancoFalso(null, erro).db, "t1", visto, {});
    expect(r).toEqual({ error: erro, mudou: false });
  });
});
