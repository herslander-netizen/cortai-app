/* eslint-disable @typescript-eslint/no-explicit-any -- simulações de banco e IA nos testes */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  afirmaConclusao,
  barrarAfirmacaoSemAcao,
  confirmacaoInequivoca,
  recusaInequivoca,
} from "./guardas";

/** Cérebro com IA e ações simuladas: nada sai para a rede. */
const estado = vi.hoisted(() => ({
  respostaDaIa: "Obrigado por confirmar sua presença!",
  executadas: [] as string[],
  falhar: false,
  falharIa: false,
  chamadasIa: 0,
  bloqueio: null as string | null,
  instrucoes: [] as string[],
}));

vi.mock("./uso.server", () => ({
  bloqueioDeUso: async () => estado.bloqueio,
  pausarIa: async () => undefined,
  registrarAcao: async () => undefined,
  registrarTurno: async () => undefined,
  retomarIa: async () => undefined,
}));
vi.mock("@/lib/fuso.server", () => ({ fusoDoTenant: async () => "America/Sao_Paulo" }));
vi.mock("./gateway.server", () => ({
  ErroDoGateway: class extends Error {},
  textoDaSaida: (s: any[]) => s[0]?.content ?? "",
  criarSessaoDoGateway: () => ({
    responder: async ({ instrucoes }: { instrucoes: string }) => {
      estado.instrucoes.push(instrucoes);
      estado.chamadasIa += 1;
      if (estado.falharIa) throw new Error("falha simulada do provedor");
      return [{ type: "message", content: estado.respostaDaIa }];
    },
  }),
}));
vi.mock("./acoes.server", () => ({
  ACOES: {
    cancelar_agendamento: {
      risco: "escrita",
      executar: async () => {
        if (estado.falhar) throw new Error("Horário já encerrado.");
        estado.executadas.push("cancelar_agendamento");
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
  id: "p1",
  acao: "cancelar_agendamento",
  dados: {},
  resumo: "Cancelar o horário de 09/10 às 10:00.",
  criadaEm: new Date().toISOString(),
};

async function pensar(mensagem: string, comPendente = true) {
  const { pensarCortai } = await import("./agente.server");
  return pensarCortai({
    ctx,
    persona,
    historico: [],
    mensagem,
    pendente: comPendente ? pendente : null,
  });
}

beforeEach(() => {
  estado.respostaDaIa = "Obrigado por confirmar sua presença!";
  estado.executadas = [];
  estado.falhar = false;
  estado.falharIa = false;
  estado.chamadasIa = 0;
  estado.bloqueio = null;
  estado.instrucoes = [];
});

describe("contexto e capacidades da Flow IA", () => {
  it("instrui o modelo a resolver referências sem adivinhar e revalidar antes de escrever", async () => {
    await pensar("quem é esse cliente?", false);
    const instrucoes = estado.instrucoes[0] ?? "";
    expect(instrucoes).toContain("Contexto conversacional");
    expect(instrucoes).toContain("o histórico sozinho não prova que o horário continua livre");
    expect(instrucoes).toContain("Capacidades");
    expect(instrucoes).toContain("Prepare uma nova proposta e exija confirmação");
  });
});

describe("números nunca confirmam ação da IA", () => {
  it("'1' e '2' não são sim/não", () => {
    expect(confirmacaoInequivoca("1")).toBe(false);
    expect(recusaInequivoca("2")).toBe(false);
  });
  it("'1' com ação pendente: não executa, mantém pendente e pede SIM/NÃO sem chamar a IA", async () => {
    const r = await pensar("1");
    expect(estado.executadas).toEqual([]);
    expect(estado.chamadasIa).toBe(0);
    expect(r.pendente?.id).toBe("p1");
    expect(r.texto).toContain("SIM");
  });
});

describe("resultado real com texto fixo", () => {
  it("SIM executa e a mensagem de sucesso é fixa (não escrita pela IA)", async () => {
    const r = await pensar("sim");
    expect(estado.executadas).toEqual(["cancelar_agendamento"]);
    expect(estado.chamadasIa).toBe(0);
    expect(r.texto).toBe("Pronto ✅ Concluído: Cancelar o horário de 09/10 às 10:00.");
    expect(r.pendente).toBeNull();
  });
  it("falha da ação: nunca afirma sucesso", async () => {
    estado.falhar = true;
    const r = await pensar("sim");
    expect(r.texto).toContain("Não consegui concluir");
    expect(r.texto).toContain("Nada foi alterado");
    expect(r.texto).not.toContain("Pronto");
  });
  it("NÃO: nada alterado, texto fixo", async () => {
    const r = await pensar("não");
    expect(estado.executadas).toEqual([]);
    expect(r.texto).toContain("não alterei nada");
  });
});

describe("barreira de saída", () => {
  it("IA dizendo 'Obrigado por confirmar sua presença!' sem ação é trocada", async () => {
    const r = await pensar("oi", false);
    expect(estado.executadas).toEqual([]);
    expect(r.texto).not.toContain("confirmar sua presença");
    expect(r.texto).toContain("não registrei nenhuma alteração");
  });
  it("detecta frases de conclusão", () => {
    for (const f of [
      "Obrigado por confirmar sua presença!",
      "Pronto, seu horário foi agendado.",
      "Cancelei seu horário.",
      "Seu agendamento foi remarcado com sucesso!",
      "Remarcado com sucesso",
    ])
      expect(afirmaConclusao(f)).toBe(true);
    for (const f of ["Posso confirmar?", "Quer que eu cancele?", "Tenho 10:00 e 11:00 livres."])
      expect(afirmaConclusao(f)).toBe(false);
  });
  it("pergunta fora do pedido pendente não apaga a pendência", async () => {
    const r = await pensar("ok, mas quanto custa?");
    expect(estado.executadas).toEqual([]);
    expect(r.pendente?.id).toBe("p1");
  });

  it("falha do provedor ao responder pergunta paralela preserva a pendência", async () => {
    estado.falharIa = true;
    const r = await pensar("quanto custa?");
    expect(estado.executadas).toEqual([]);
    expect(r.pendente?.id).toBe("p1");
    expect(r.indisponivel).toContain("falha simulada");
  });

  it("com pendente, a troca repete o resumo e pede confirmação", () => {
    expect(barrarAfirmacaoSemAcao("Agendei para você!", "Agendar corte às 10:00.")).toBe(
      "Agendar corte às 10:00. Posso confirmar?",
    );
  });
});

describe("interruptor geral, pausa e cotas dentro do cérebro", () => {
  it("desligada no ADM: não chama a IA, não executa a pendente e a preserva", async () => {
    estado.bloqueio = "desligada";
    const r = await pensar("sim");
    expect(estado.chamadasIa).toBe(0);
    expect(estado.executadas).toEqual([]);
    expect(r.bloqueio).toBe("desligada");
    expect(r.indisponivel).toContain("desligada");
    expect(r.pendente?.id).toBe("p1");
  });
  it("pausada por crédito: responde com texto fixo, sem chamar a IA", async () => {
    estado.bloqueio = "pausada";
    const r = await pensar("oi", false);
    expect(estado.chamadasIa).toBe(0);
    expect(r.bloqueio).toBe("pausada");
    expect(r.texto).toContain("créditos");
  });
  it("sem bloqueio, segue normal", async () => {
    const r = await pensar("oi", false);
    expect(estado.chamadasIa).toBe(1);
    expect(r.bloqueio ?? null).toBeNull();
  });
});
