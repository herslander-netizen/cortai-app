import { beforeEach, describe, expect, it, vi } from "vitest";

type Chamada = { tabela: string; op: string; valor?: unknown; filtros: [string, unknown][] };
const chamadas: Chamada[] = [];
const rpcs: string[] = [];
let linhaAtual: Record<string, unknown> = {};

function consulta(tabela: string) {
  const c: Chamada = { tabela, op: "select", filtros: [] };
  chamadas.push(c);
  const resultado = () => {
    if (tabela === "agendamentos" && c.op === "select") return { data: linhaAtual, error: null };
    return { data: { id: "x" }, error: null };
  };
  const p: Record<string, unknown> = {
    select: () => p,
    update: (v: unknown) => ((c.op = "update"), (c.valor = v), p),
    insert: (v: unknown) => ((c.op = "insert"), (c.valor = v), p),
    eq: (k: string, v: unknown) => (c.filtros.push([k, v]), p),
    in: () => p,
    maybeSingle: async () => resultado(),
    single: async () => resultado(),
    then: (ok: (r: unknown) => unknown) => Promise.resolve(resultado()).then(ok),
  };
  return p;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (t: string) => consulta(t),
    rpc: async (fn: string) => (rpcs.push(fn), { data: { agendamento_id: "novo" }, error: null }),
  },
}));
vi.mock("@/lib/agenda-regras.server", () => ({ validarAgendamento: async () => null }));
vi.mock("@/lib/whatsapp/notificacoes.server", () => ({ notificarAgendamento: async () => ({}) }));

const { cancelarAgendamento, remarcarAgendamento } = await import("./acoes.server");

const updatesDeAgendamento = () =>
  chamadas.filter((c) => c.tabela === "agendamentos" && c.op === "update");

beforeEach(() => {
  chamadas.length = 0;
  rpcs.length = 0;
  linhaAtual = {
    id: "antigo",
    tenant_id: "t1",
    servico_id: "s1",
    profissional_id: "p1",
    cliente_id: "c1",
    forma_pagamento: "balcao",
    origem: "link_publico",
  };
});

describe("assistência da Flow IA", () => {
  it("cancelar pela Flow IA marca assistido sem alterar origem", async () => {
    await cancelarAgendamento(
      { tenantId: "t1", externalAgentId: "a", origemCortai: "whatsapp" },
      { agendamentoId: "antigo" },
    );
    const u = updatesDeAgendamento();
    expect(u).toHaveLength(1);
    expect(u[0]!.valor).toEqual({ assistido_por_cortai: true });
    expect(u[0]!.filtros).toContainEqual(["tenant_id", "t1"]);
  });

  it("remarcar pela Flow IA: novo herda origem original; antigo só ganha assistido", async () => {
    await remarcarAgendamento(
      { tenantId: "t1", externalAgentId: "a", origemCortai: "whatsapp" },
      { agendamentoId: "antigo", novoInicio: "2026-10-10T13:00:00Z" },
    );
    const u = updatesDeAgendamento();
    expect(u.find((c) => c.filtros.some(([k, v]) => k === "id" && v === "novo"))!.valor).toEqual({
      assistido_por_cortai: true,
      origem: "link_publico",
    });
    expect(u.find((c) => c.filtros.some(([k, v]) => k === "id" && v === "antigo"))!.valor).toEqual({
      assistido_por_cortai: true,
    });
  });

  it("sem contexto da Flow IA (legado) não marca nada", async () => {
    await cancelarAgendamento(
      { tenantId: "t1", externalAgentId: "a" },
      { agendamentoId: "antigo" },
    );
    expect(updatesDeAgendamento()).toHaveLength(0);
  });
});
