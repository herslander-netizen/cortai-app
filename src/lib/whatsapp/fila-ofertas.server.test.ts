import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmacao = vi.hoisted(() => ({ envios: 0, enviado: true }));
vi.mock("./confirmacao.server", () => ({
  enviarConfirmacaoDeAgendamento: async () => {
    confirmacao.envios += 1;
    return { enviado: confirmacao.enviado };
  },
}));

/** Banco simulado: nenhuma chamada sai para o banco real. */
type Estado = {
  automatica: boolean;
  fila: Record<string, unknown>[];
  inserts: Record<string, unknown>[];
  ranges: [number, number][];
  orders: string[];
  recusada: Record<string, unknown> | null;
  aceite: Record<string, unknown>;
  ofertaPerdida: Record<string, unknown> | null;
  filaUpdates: Record<string, unknown>[];
};
const AGORA = Date.UTC(2026, 9, 5, 12, 0);
const INICIO = AGORA + 3 * 3600_000;
let st: Estado;

function builder(tabela: string) {
  const ctx: { op: string; payload?: Record<string, unknown> } = { op: "select" };
  const resolver = () => {
    if (tabela === "agendamentos" && ctx.op === "select")
      return {
        data: {
          id: "ag1",
          tenant_id: "t1",
          inicio: new Date(INICIO).toISOString(),
          fim: new Date(INICIO + 3600_000).toISOString(),
          status: "cancelado",
          profissional_id: "p1",
          servico_id: "s1",
        },
      };
    if (tabela === "tenants") return { data: { lista_espera_automatica: st.automatica } };
    if (tabela === "servicos")
      return { data: [{ id: "s1", duracao_min: 30, profissional_ids: null }] };
    if (tabela === "ofertas_da_fila" && ctx.op === "insert") {
      st.inserts.push(ctx.payload!);
      return { data: { id: "of1", token: "abc" }, error: null };
    }
    if (tabela === "ofertas_da_fila" && ctx.op === "update") return { data: st.recusada };
    if (tabela === "ofertas_da_fila" && ctx.op === "select") return { data: st.ofertaPerdida };
    if (tabela === "fila_de_espera" && ctx.op === "select") return { data: st.fila };
    return { data: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  const chain = () => b;
  for (const m of ["select", "eq", "in", "gt", "lt", "not", "or", "limit", "is"]) b[m] = chain;
  b.order = (col: string) => {
    if (tabela === "fila_de_espera") st.orders.push(col);
    return b;
  };
  b.range = (de: number, ate: number) => {
    st.ranges.push([de, ate]);
    return b;
  };
  b.insert = (p: Record<string, unknown>) => ((ctx.op = "insert"), (ctx.payload = p), b);
  b.update = (p: Record<string, unknown>) => {
    ctx.op = "update";
    if (tabela === "fila_de_espera") st.filaUpdates.push(p);
    return b;
  };
  b.maybeSingle = async () => {
    const r = resolver();
    if (tabela === "agendamentos" && Array.isArray(r.data)) return { data: null };
    return r;
  };
  b.single = async () => resolver();
  b.then = (ok: (v: unknown) => unknown) => {
    const r = resolver();
    if (tabela === "agendamentos") return Promise.resolve({ data: [] }).then(ok);
    if (tabela === "ofertas_da_fila" && ctx.op === "select")
      return Promise.resolve({ data: [] }).then(ok);
    return Promise.resolve(r).then(ok);
  };
  return b;
}

const db = {
  from: (t: string) => builder(t),
  rpc: async (nome: string) =>
    nome === "aceitar_oferta_da_fila" ? { data: st.aceite, error: null } : { data: true },
};

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
vi.mock("@/lib/fuso.server", () => ({ fusoDoTenant: async () => "America/Sao_Paulo" }));
vi.mock("@/lib/agenda-regras.server", () => ({
  STATUS_QUE_OCUPAM: ["confirmado"],
  regrasDaBarbearia: async () => ({ intervaloEntreMin: 0, fuso: "America/Sao_Paulo" }),
  validarAgendamento: async () => null,
}));

const linha = (id: string, posicao: number) => ({
  id,
  posicao,
  criado_em: "2026-10-01T00:00:00Z",
  profissional_id: null,
  servico_id: null,
  janela_preferida: {},
  cliente_id: `c-${id}`,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AGORA);
  st = {
    automatica: true,
    fila: [linha("primeiro", 1), linha("segundo", 2)],
    inserts: [],
    ranges: [],
    orders: [],
    recusada: null,
    aceite: { ok: true, agendamento_id: "ag-novo" },
    ofertaPerdida: null,
    filaUpdates: [],
  };
  confirmacao.envios = 0;
  confirmacao.enviado = true;
});

describe("recuperação automática de vagas", () => {
  it("desligada: não cria oferta", async () => {
    st.automatica = false;
    const { ofertarVaga } = await import("./fila-ofertas.server");
    const r = await ofertarVaga("ag1");
    expect(r.motivo).toBe("automacao_desligada");
    expect(st.inserts).toHaveLength(0);
  });

  it("ligada: oferta ao primeiro da ordem real, com prazo de 30 min", async () => {
    const { ofertarVaga } = await import("./fila-ofertas.server");
    const r = await ofertarVaga("ag1");
    expect(r.ofertaId).toBe("of1");
    expect(st.inserts[0]?.["fila_id"]).toBe("primeiro");
    expect(st.inserts[0]?.["expira_em"]).toBe(new Date(AGORA + 30 * 60_000).toISOString());
    expect(st.orders).toEqual(["posicao", "criado_em", "id"]);
    expect(st.ranges[0]).toEqual([0, 199]);
  });

  it("perto do horário: prazo termina 10 min antes", async () => {
    vi.setSystemTime(INICIO - 20 * 60_000);
    const { ofertarVaga } = await import("./fila-ofertas.server");
    await ofertarVaga("ag1");
    expect(st.inserts[0]?.["expira_em"]).toBe(new Date(INICIO - 10 * 60_000).toISOString());
  });

  it("recusa passa ao próximo quando ligada", async () => {
    st.recusada = { fila_id: "primeiro", agendamento_liberado_id: "ag1" };
    const { recusarOferta } = await import("./fila-ofertas.server");
    const r = await recusarOferta("abc");
    expect(r.ok).toBe(true);
    expect(st.inserts).toHaveLength(1);
  });

  it("recusa com automação desligada não avança e não remove ninguém", async () => {
    st.automatica = false;
    st.recusada = { fila_id: "primeiro", agendamento_liberado_id: "ag1" };
    const { recusarOferta } = await import("./fila-ofertas.server");
    const r = await recusarOferta("abc");
    expect(r.ok).toBe(true);
    expect(st.inserts).toHaveLength(0);
  });
});
