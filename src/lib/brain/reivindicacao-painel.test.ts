import { describe, expect, it, vi } from "vitest";
import { reivindicarPendentePainel } from "./reivindicacao-painel";

const ID = "m-1";
const entrada = {
  mensagemId: ID,
  tenantId: "tenant-1",
  pendenteId: "pend-1",
  acaoDaMensagem: { intencao: "conversa", pendente: { id: "pend-1" } },
};

function bancoDeTeste(resposta: { data: { id: string }[] | null; error: Error | null }) {
  const filtros: [string, unknown][] = [];
  let atualizado: unknown = null;
  const q = {
    update: vi.fn((novo: unknown) => { atualizado = novo; return q; }),
    eq: vi.fn((campo: string, valor: unknown) => { filtros.push([campo, valor]); return q; }),
    select: vi.fn(async () => resposta),
  };
  return {
    db: { from: vi.fn(() => q) },
    q,
    filtros,
    atualizado: () => atualizado,
  };
}

describe("reivindicação exclusiva da confirmação no painel", () => {
  it("só libera a ação quando o banco comprova que consumiu a pendente", async () => {
    const b = bancoDeTeste({ data: [{ id: ID }], error: null });
    expect(await reivindicarPendentePainel(b.db, entrada)).toBe(true);
    expect(b.filtros).toContainEqual(["id", ID]);
    expect(b.filtros).toContainEqual(["tenant_id", "tenant-1"]);
    expect(b.filtros).toContainEqual(["acao->pendente->>id", "pend-1"]);
    expect(b.atualizado()).toEqual({ acao: { intencao: "conversa", pendente: null } });
  });
  it("repetição e perda da disputa NÃO executam a ação", async () => {
    const b = bancoDeTeste({ data: [], error: null });
    expect(await reivindicarPendentePainel(b.db, entrada)).toBe(false);
  });
  it("falha de banco lança erro e não autoriza execução", async () => {
    const b = bancoDeTeste({ data: null, error: new Error("timeout") });
    await expect(reivindicarPendentePainel(b.db, entrada)).rejects.toThrow("nenhuma ação foi executada");
  });
  it("não aceita confirmação sem mensagem válida ou payload registrado", async () => {
    const b = bancoDeTeste({ data: [{ id: ID }], error: null });
    await expect(reivindicarPendentePainel(b.db, { ...entrada, mensagemId: null })).rejects.toThrow();
    await expect(reivindicarPendentePainel(b.db, { ...entrada, acaoDaMensagem: null })).rejects.toThrow();
    expect(b.db.from).not.toHaveBeenCalled();
  });
  it("uma linha inesperada não libera uma confirmação", async () => {
    const b = bancoDeTeste({ data: [{ id: "outra" }], error: null });
    expect(await reivindicarPendentePainel(b.db, entrada)).toBe(false);
  });
});
