/* eslint-disable @typescript-eslint/no-explicit-any -- simulações de banco e IA nos testes */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Resposta a avisos com banco em memória: nada sai para o banco real nem para o WhatsApp.
 * Cobre o bug do "1" (dois avisos abertos) e as ações confirmar/remarcar/cancelar.
 */
type Linha = Record<string, any>;
const banco = vi.hoisted(() => ({
  tabelas: {} as Record<string, Linha[]>,
  rpcs: [] as { nome: string; args: any }[],
  rpcResultado: {} as Record<string, { data?: any; error?: { message: string } | null }>,
}));

vi.mock("@/lib/fuso.server", () => ({ fusoDoTenant: async () => "America/Sao_Paulo" }));
vi.mock("@/lib/telefone", () => ({ variantesDoTelefone: (t: string) => [t] }));
vi.mock("./aviso-equipe.server", () => ({ avisarEquipeDaConfirmacao: async () => undefined }));
vi.mock("./notificacoes.server", () => ({
  notificarAgendamento: async () => ({ enviado: false }),
}));

function consulta(tabela: string) {
  const filtros: ((l: Linha) => boolean)[] = [];
  let atualizar: Linha | null = null;
  let inserir = false;
  const q: any = {
    select: () => q,
    order: () => q,
    limit: () => q,
    eq: (c: string, v: any) => (filtros.push((l) => l[c] === v), q),
    is: (c: string, v: any) => (filtros.push((l) => (l[c] ?? null) === v), q),
    gt: (c: string, v: any) => (filtros.push((l) => l[c] > v), q),
    in: (c: string, v: any[]) => (filtros.push((l) => v.includes(l[c])), q),
    update: (d: Linha) => ((atualizar = d), q),
    insert: () => ((inserir = true), q),
  };
  const executar = () => {
    if (inserir) return [];
    const linhas = (banco.tabelas[tabela] ?? []).filter((l) => filtros.every((f) => f(l)));
    if (atualizar) for (const l of linhas) Object.assign(l, atualizar);
    return linhas;
  };
  q.maybeSingle = async () => ({ data: executar()[0] ?? null });
  q.then = (ok: any, erro: any) =>
    Promise.resolve({ data: executar(), error: null }).then(ok, erro);
  return q;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (t: string) => consulta(t),
    rpc: async (nome: string, args: any) => {
      banco.rpcs.push({ nome, args });
      return banco.rpcResultado[nome] ?? { data: { ok: true }, error: null };
    },
  },
}));

const futuro = new Date(Date.now() + 3600_000).toISOString();
const TEL = "5511999990000";
function aviso(id: string, ag: string, acoes: string[], enviadoEm: string) {
  return {
    id,
    tenant_id: "t1",
    agendamento_id: ag,
    tipo: "x",
    telefone: TEL,
    conteudo: id,
    acoes,
    aguarda_resposta: true,
    respondido_em: null,
    valido_ate: futuro,
    enviado_em: enviadoEm,
  };
}

beforeEach(() => {
  banco.rpcs = [];
  banco.rpcResultado = {};
  banco.tabelas = {
    conversas_whatsapp: [{ id: "c1", contexto: {} }],
    tenants: [{ id: "t1", slug: "aurora" }],
    acoes_de_ia_log: [],
    envios_de_whatsapp: [],
    agendamentos: [
      { id: "ag1", tenant_id: "t1", inicio: "2026-10-09T13:00:00Z", status: "agendado" },
      { id: "ag2", tenant_id: "t1", inicio: "2026-10-10T17:00:00Z", status: "agendado" },
      { id: "agB", tenant_id: "t2", inicio: "2026-10-09T13:00:00Z", status: "agendado" },
    ],
  };
});

async function responder(texto: string, tenantId = "t1") {
  const { tratarRespostaDeLembrete } = await import("./lembretes.server");
  return tratarRespostaDeLembrete({ tenantId, conversaId: "c1", telefone: TEL, texto });
}

describe("bug do '1' — dois avisos abertos", () => {
  it("confirmação (Remarcar/Cancelar) + lembrete (Confirmar) do MESMO horário: '1' confirma de verdade", async () => {
    banco.tabelas["envios_de_whatsapp"] = [
      aviso(
        "lembrete",
        "ag1",
        ["CORTAI_CONFIRMAR", "CORTAI_REMARCAR", "CORTAI_CANCELAR"],
        "2026-10-08T12:24:00Z",
      ),
      aviso("confirmacao", "ag1", ["CORTAI_REMARCAR", "CORTAI_CANCELAR"], "2026-10-08T12:00:00Z"),
    ];
    const r = await responder("1");
    expect(banco.rpcs.map((c) => c.nome)).toEqual(["confirmar_presenca_whatsapp"]);
    expect(r?.texto).toMatch(/^Confirmado ✅/);
  });

  it("horários diferentes: pergunta qual, sem executar nada e sem ir para a IA", async () => {
    banco.tabelas["envios_de_whatsapp"] = [
      aviso("e2", "ag2", ["CORTAI_CONFIRMAR"], "2026-10-08T12:24:00Z"),
      aviso("e1", "ag1", ["CORTAI_CONFIRMAR"], "2026-10-08T12:00:00Z"),
    ];
    const r = await responder("1");
    expect(r).not.toBeNull();
    expect(r!.texto).toContain("A qual deles se refere?");
    expect(banco.rpcs).toEqual([]);
    // Escolhe o segundo horário: agora sim executa, no horário certo.
    const r2 = await responder("2");
    expect(banco.rpcs).toEqual([
      { nome: "confirmar_presenca_whatsapp", args: { _agendamento_id: "ag1" } },
    ]);
    expect(r2?.texto).toMatch(/^Confirmado ✅/);
  });

  it("número que não é opção: responde as opções reais, nunca cai na IA", async () => {
    banco.tabelas["envios_de_whatsapp"] = [
      aviso("e1", "ag1", ["CORTAI_REMARCAR", "CORTAI_CANCELAR"], "2026-10-08T12:00:00Z"),
    ];
    const r = await responder("1");
    expect(r?.texto).toContain("Não encontrei essa opção");
    expect(r?.texto).toContain("2 - Remarcar");
    expect(banco.rpcs).toEqual([]);
  });

  it("número aceito mesmo se outra mensagem saiu depois do aviso (dentro do prazo)", async () => {
    banco.tabelas["envios_de_whatsapp"] = [
      aviso("e1", "ag1", ["CORTAI_CONFIRMAR"], "2026-10-08T12:00:00Z"),
    ];
    const r = await responder("1");
    expect(r?.texto).toMatch(/^Confirmado ✅/);
  });
});

describe("ações pelo número fixo", () => {
  const todas = ["CORTAI_CONFIRMAR", "CORTAI_REMARCAR", "CORTAI_CANCELAR"];
  beforeEach(() => {
    banco.tabelas["envios_de_whatsapp"] = [aviso("e1", "ag1", todas, "2026-10-08T12:00:00Z")];
  });

  it("2 = Remarcar: pergunta o novo horário, sem alterar a agenda", async () => {
    const r = await responder("2");
    expect(r?.texto).toContain("Para qual dia e horário");
    expect(banco.rpcs).toEqual([]);
  });

  it("3 = Cancelar: cancela de verdade e responde com texto fixo", async () => {
    const r = await responder("3");
    expect(banco.rpcs.map((c) => c.nome)).toEqual(["cancelar_agendamento"]);
    expect(r?.texto).toMatch(/^Cancelado ✅/);
  });

  it("resposta repetida não executa duas vezes", async () => {
    await responder("1");
    const r = await responder("1");
    expect(banco.rpcs.length).toBe(1);
    expect(r).toBeNull(); // aviso já respondido: nada aberto
  });

  it("falha ao confirmar: nunca afirma sucesso", async () => {
    banco.rpcResultado["confirmar_presenca_whatsapp"] = { data: { ok: false }, error: null };
    const r = await responder("1");
    expect(r?.texto).not.toMatch(/Confirmado/);
    expect(r?.texto).toContain("não está mais ativo");
  });

  it("falha ao cancelar: nunca afirma sucesso", async () => {
    banco.rpcResultado["cancelar_agendamento"] = {
      data: null,
      error: { message: "erro qualquer" },
    };
    const r = await responder("3");
    expect(r?.texto).not.toMatch(/Cancelado ✅/);
    expect(r?.texto).toContain("Não consegui cancelar");
  });

  it("outro negócio não enxerga o aviso", async () => {
    const r = await responder("1", "t2");
    expect(r).toBeNull();
    expect(banco.rpcs).toEqual([]);
  });
});
