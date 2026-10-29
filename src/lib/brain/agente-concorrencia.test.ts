/* eslint-disable @typescript-eslint/no-explicit-any -- simulações de banco e IA nos testes */
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Duas confirmações quase juntas sobre a MESMA ação pendente: só uma pode executar. */
const estado = vi.hoisted(() => ({
  executadas: [] as string[],
  chamadasIa: 0,
  estados: [] as string[],
}));

vi.mock("./uso.server", () => ({
  bloqueioDeUso: async () => null,
  pausarIa: async () => undefined,
  registrarAcao: async () => undefined,
  registrarTurno: async () => undefined,
  retomarIa: async () => undefined,
}));
vi.mock("@/lib/fuso.server", () => ({ fusoDoTenant: async () => "America/Sao_Paulo" }));
vi.mock("./observabilidade.server", () => ({
  iniciarTurno: () => ({
    runId: "t",
    aoChamarModelo: () => undefined,
    registrarFerramenta: () => undefined,
    definirEstado: (e: string) => estado.estados.push(e),
    finalizar: async () => undefined,
  }),
}));
vi.mock("./gateway.server", () => ({
  ErroDoGateway: class extends Error {},
  textoDaSaida: (s: any[]) => s[0]?.content ?? "",
  criarSessaoDoGateway: () => ({
    responder: async () => {
      estado.chamadasIa += 1;
      return [{ type: "message", content: "Posso ajudar com algo mais?" }];
    },
  }),
}));
vi.mock("./acoes.server", () => ({
  ACOES: {
    criar_agendamento: {
      risco: "escrita",
      executar: async () => {
        // Cede a vez: simula a latência do banco, onde a corrida acontece.
        await new Promise((r) => setTimeout(r, 15));
        estado.executadas.push("criar_agendamento");
        return { ok: true };
      },
    },
  },
  acaoPermitida: () => true,
  ehEquipeNoWhatsapp: () => false,
  ferramentasDoContexto: () => [],
}));

const ctx = {
  tenantId: "t1",
  canal: "whatsapp",
  ator: "551199",
  telefoneCliente: "551199",
  papel: "cliente",
} as any;
const persona = { nome: "Flow IA", negocio: "Aurora" };
const pendente = {
  id: "pendente-1",
  acao: "criar_agendamento",
  dados: {},
  resumo: "Agendar corte amanhã às 10:00.",
  criadaEm: new Date().toISOString(),
};

async function pensar(mensagem: string, extra: Record<string, unknown> = {}) {
  const { pensarCortai } = await import("./agente.server");
  return pensarCortai({ ctx, persona, historico: [], mensagem, pendente, ...extra } as any);
}

/** Reivindicação atômica simulada: a primeira chamada leva, as demais perdem. */
function reivindicacao() {
  let consumida = false;
  return async (id: string) => {
    expect(id).toBe("pendente-1");
    await Promise.resolve();
    if (consumida) return false;
    consumida = true;
    return true;
  };
}

beforeEach(() => {
  estado.executadas.length = 0;
  estado.estados.length = 0;
  estado.chamadasIa = 0;
});

describe("confirmações simultâneas da mesma ação pendente", () => {
  it("dois SIM ao mesmo tempo executam UMA vez e o segundo recebe aviso honesto", async () => {
    const consumirPendente = reivindicacao();
    const [a, b] = await Promise.all([
      pensar("sim", { consumirPendente }),
      pensar("sim", { consumirPendente }),
    ]);
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    const textos = [a.texto, b.texto];
    expect(textos.filter((t) => t.startsWith("Pronto ✅"))).toHaveLength(1);
    expect(textos.filter((t) => t.includes("já foi tratada"))).toHaveLength(1);
    expect(estado.estados).toContain("confirmacao_duplicada");
    expect(estado.estados).toContain("acao_confirmada_executada");
  });

  it("cinco confirmações em rajada continuam executando uma só vez", async () => {
    const consumirPendente = reivindicacao();
    await Promise.all(
      Array.from({ length: 5 }, () =>
        pensar("pode confirmar".replace("pode confirmar", "sim"), { consumirPendente }),
      ),
    );
    expect(estado.executadas).toHaveLength(1);
  });

  it("se não conseguir reivindicar (erro), NADA executa e a pendente continua valendo", async () => {
    const r = await pensar("sim", {
      consumirPendente: async () => {
        throw new Error("banco fora");
      },
    });
    expect(estado.executadas).toHaveLength(0);
    expect(r.texto).toContain("nada foi alterado");
    expect(r.pendente?.id).toBe("pendente-1");
  });

  it("reivindicação negada nunca chama o modelo nem a ação", async () => {
    const r = await pensar("sim", { consumirPendente: async () => false });
    expect(estado.executadas).toHaveLength(0);
    expect(estado.chamadasIa).toBe(0);
    expect(r.pendente).toBeNull();
  });
});

describe("o que NÃO confirma", () => {
  it.each(["1", "2", "talvez", "sim, mas muda para as 11", "não sei", "ok mas e o preço?"])(
    "%s não executa a ação",
    async (msg) => {
      const consumirPendente = vi.fn(async () => true);
      await pensar(msg, { consumirPendente });
      expect(estado.executadas).toHaveLength(0);
      expect(consumirPendente).not.toHaveBeenCalled();
    },
  );

  it("pendente vencida (mais de 15 min) não executa, mesmo com SIM", async () => {
    const consumirPendente = vi.fn(async () => true);
    await pensar("sim", {
      consumirPendente,
      pendente: { ...pendente, criadaEm: new Date(Date.now() - 16 * 60_000).toISOString() },
    });
    expect(estado.executadas).toHaveLength(0);
    expect(consumirPendente).not.toHaveBeenCalled();
  });

  it("recusa não executa nem reivindica", async () => {
    const consumirPendente = vi.fn(async () => true);
    const r = await pensar("não", { consumirPendente });
    expect(estado.executadas).toHaveLength(0);
    expect(consumirPendente).not.toHaveBeenCalled();
    expect(estado.estados).toContain("acao_recusada");
    expect(r.pendente).toBeNull();
  });
});

describe("sem a função de reivindicação", () => {
  it("o comportamento anterior continua (compatibilidade)", async () => {
    const r = await pensar("sim");
    expect(estado.executadas).toEqual(["criar_agendamento"]);
    expect(r.texto).toMatch(/^Pronto ✅/);
  });
});
