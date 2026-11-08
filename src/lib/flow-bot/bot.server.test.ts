import { beforeEach, describe, expect, it, vi } from "vitest";

import { PerfilDeRealidade, realidadeDeExemplo } from "./nucleo/contratos";
import perfil from "./modelos/perfil.json";

/**
 * Orquestrador do Flow Bot com banco falso: o que ele grava, quando envia e quando devolve o turno à Flow IA.
 * Os oito pedidos do dono de 05/11 passam pelo modelo padrão real (motor, gatilhos e textos de verdade).
 */

type Linha = Record<string, unknown>;
type Estado = {
  config: Linha | null;
  conversa: Linha | null;
  sessao: Linha | null;
  rastroDuplicado: boolean;
  inseridos: { tabela: string; linha: Linha }[];
  atualizados: { tabela: string; linha: Linha }[];
  upserts: { tabela: string; linha: Linha }[];
  rpcs: string[];
};

const estado: Estado = {
  config: null,
  conversa: null,
  sessao: null,
  rastroDuplicado: false,
  inseridos: [],
  atualizados: [],
  upserts: [],
  rpcs: [],
};

function consulta(tabela: string) {
  const resultado = (): { data: unknown; error: unknown } => {
    if (tabela === "flow_bot_config") return { data: estado.config, error: null };
    if (tabela === "conversas_whatsapp") return { data: estado.conversa, error: null };
    if (tabela === "flow_bot_sessoes") return { data: estado.sessao, error: null };
    return { data: null, error: null };
  };
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () => resultado(),
    insert: (linha: Linha) => {
      estado.inseridos.push({ tabela, linha });
      return {
        select: () => ({
          single: async () =>
            tabela === "flow_bot_rastro" && estado.rastroDuplicado
              ? { data: null, error: { code: "23505", message: "duplicada" } }
              : { data: { id: "rastro-1" }, error: null },
        }),
      };
    },
    update: (linha: Linha) => {
      estado.atualizados.push({ tabela, linha });
      return { eq: async () => ({ error: null }) };
    },
    upsert: async (linha: Linha) => {
      estado.upserts.push({ tabela, linha });
      return { error: null };
    },
  };
  return q;
}

const enviar = vi.fn(async (_entrada: Record<string, unknown>) => undefined);

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (tabela: string) => consulta(tabela),
    rpc: (nome: string) => {
      estado.rpcs.push(nome);
      return Promise.resolve({ data: null, error: null });
    },
  },
}));
vi.mock("./realidade.server", () => ({
  realidadeDoNegocio: async () => realidadeDeExemplo(PerfilDeRealidade.parse(perfil)),
}));
vi.mock("@/lib/whatsapp/identidade.server", () => ({ identificarEquipe: async () => null }));
vi.mock("@/lib/whatsapp/fluxo.server", () => ({ enviarPelaBarbearia: enviar }));
const agenda = vi.fn(async (_e: Record<string, unknown>): Promise<boolean | null> => null);
vi.mock("./agenda-na-conversa/atender.server", () => ({ atenderAgendaNaConversa: agenda }));

const { responderComFlowBot } = await import("./bot.server");

function entrada(texto: string, id = `msg-${texto}`) {
  return {
    tenantId: "t1",
    conversaId: "c1",
    conexaoId: "x1",
    sessaoId: "flow-bot-teste",
    telefone: "5500000000001",
    texto,
    mensagemExternaId: id,
    nomeContato: "Ana",
  };
}

function rastros() {
  return estado.inseridos.filter((i) => i.tabela === "flow_bot_rastro").map((i) => i.linha);
}

beforeEach(() => {
  estado.config = {
    modo: "sombra",
    horario: "sempre",
    pausa_humano_min: 120,
    versao_publicada: null,
  };
  estado.conversa = { id: "c1", modo_humano: false, modo_humano_ate: null };
  estado.sessao = null;
  estado.rastroDuplicado = false;
  estado.inseridos = [];
  estado.atualizados = [];
  estado.upserts = [];
  estado.rpcs = [];
  enviar.mockClear();
  agenda.mockReset();
  agenda.mockResolvedValue(null);
});

describe("Flow Bot em sombra — oito pedidos do dono (05/11)", () => {
  const casos: [string, string, RegExp | null][] = [
    ["Olá, gostaria de agendar.", "encaminhada", /chamar alguém da equipe/],
    ["Quero remarcar meu horário.", "sem_regra", null],
    ["Tem horário livre amanhã?", "encaminhada", /chamar alguém da equipe/],
    ["Quanto custa a escova?", "concluida", /Escova — R\$/],
    ["Quero cancelar meu horário.", "sem_regra", null],
    ["Quais serviços vocês oferecem?", "concluida", /Serviços de /],
    ["Quero falar com um atendente.", "encaminhada", /chamar alguém da equipe/],
    ["Obrigado.", "sem_regra", null],
  ];

  it.each(casos)("%s → %s", async (texto, motivo, resposta) => {
    const atendeu = await responderComFlowBot(entrada(texto));

    // Sombra nunca responde: o turno sempre volta para a Flow IA.
    expect(atendeu).toBe(false);
    expect(enviar).not.toHaveBeenCalled();
    // Nem pausa a conversa nem chama a equipe: só registra o que faria.
    expect(estado.atualizados.filter((a) => a.tabela === "conversas_whatsapp")).toEqual([]);
    expect(estado.rpcs).toEqual([]);

    const [rastro] = rastros();
    expect(rastro).toMatchObject({
      tenant_id: "t1",
      conversa_id: "c1",
      mensagem_externa_id: `msg-${texto}`,
      modo: "sombra",
      motivo,
      enviado: false,
    });
    const respostas = rastro?.["respostas"] as string[];
    if (resposta) expect(respostas.join("\n")).toMatch(resposta);
    else expect(respostas).toEqual([]);
    // Nunca a saudação com menu genérico como resposta prevista.
    expect(respostas.join("\n")).not.toMatch(/Como posso ajudar\?/);
  });

  it("sem regra não deixa o menu como pergunta em aberto na sessão", async () => {
    await responderComFlowBot(entrada("Obrigado."));
    const sessao = estado.upserts.find((u) => u.tabela === "flow_bot_sessoes")?.linha["sessao"] as {
      status: string;
    };
    expect(sessao.status).not.toBe("waiting_input");
  });
});

describe("Flow Bot — convivência com a Flow IA e com a equipe", () => {
  it("desligado (ou sem configuração): não grava nada e devolve o turno", async () => {
    estado.config = null;
    expect(await responderComFlowBot(entrada("quero agendar"))).toBe(false);
    estado.config = { modo: "desligado" };
    expect(await responderComFlowBot(entrada("quero agendar"))).toBe(false);
    expect(estado.inseridos).toEqual([]);
  });

  it("pessoa da equipe no controle: bloqueia fallback automático e não grava rastro", async () => {
    estado.config = { modo: "ligado", horario: "sempre", pausa_humano_min: 120 };
    estado.conversa = { id: "c1", modo_humano_ate: new Date(Date.now() + 60_000).toISOString() };
    expect(await responderComFlowBot(entrada("quero agendar"))).toBe(true);
    expect(enviar).not.toHaveBeenCalled();
    expect(rastros()).toEqual([]);
  });

  it("ligado com regra: envia uma vez pelo caminho oficial e marca o rastro como enviado", async () => {
    estado.config = { modo: "ligado", horario: "sempre", pausa_humano_min: 120 };
    expect(await responderComFlowBot(entrada("Quanto custa a escova?"))).toBe(true);
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0]?.[0]).toMatchObject({ sessaoId: "flow-bot-teste", porIa: false });
    expect(estado.atualizados).toContainEqual({
      tabela: "flow_bot_rastro",
      linha: { enviado: true },
    });
  });

  it("ligado sem regra (remarcar): não envia menu, a Flow IA assume", async () => {
    estado.config = { modo: "ligado", horario: "sempre", pausa_humano_min: 120 };
    expect(await responderComFlowBot(entrada("Quero remarcar meu horário."))).toBe(false);
    expect(enviar).not.toHaveBeenCalled();
    expect(rastros()[0]).toMatchObject({ motivo: "sem_regra", respostas: [] });
  });

  it("ligado pedindo atendente: avisa, pausa bot e Flow IA e chama a equipe", async () => {
    estado.config = { modo: "ligado", horario: "sempre", pausa_humano_min: 30 };
    expect(await responderComFlowBot(entrada("Quero falar com um atendente."))).toBe(true);
    expect(enviar).toHaveBeenCalledTimes(1);
    const pausa = estado.atualizados.find((a) => a.tabela === "conversas_whatsapp")?.linha;
    expect(typeof pausa?.["modo_humano_ate"]).toBe("string");
    expect(estado.rpcs).toEqual(["criar_notificacao"]);
  });

  it("mesma mensagem entregue de novo: não envia outra vez", async () => {
    estado.config = { modo: "ligado", horario: "sempre", pausa_humano_min: 120 };
    estado.rastroDuplicado = true;
    expect(await responderComFlowBot(entrada("Quanto custa a escova?"))).toBe(true);
    expect(enviar).not.toHaveBeenCalled();
    estado.config = { modo: "sombra", horario: "sempre", pausa_humano_min: 120 };
    expect(await responderComFlowBot(entrada("Quanto custa a escova?"))).toBe(false);
    expect(enviar).not.toHaveBeenCalled();
  });

  it("ligado: o agendamento na conversa responde primeiro e o bot não fala por cima", async () => {
    estado.config = { modo: "ligado", horario: "sempre", pausa_humano_min: 120 };
    agenda.mockResolvedValue(true);
    expect(await responderComFlowBot(entrada("Quero remarcar meu horário."))).toBe(true);
    expect(agenda).toHaveBeenCalledTimes(1);
    expect(rastros()).toHaveLength(0);
    expect(enviar).not.toHaveBeenCalled();
  });

  it("sombra nunca roda o agendamento na conversa (ele grava na agenda)", async () => {
    expect(await responderComFlowBot(entrada("Quero remarcar meu horário."))).toBe(false);
    expect(agenda).not.toHaveBeenCalled();
  });

  it("falha no agendamento na conversa não trava: as regras do bot seguem", async () => {
    estado.config = { modo: "ligado", horario: "sempre", pausa_humano_min: 120 };
    agenda.mockRejectedValue(new Error("banco fora"));
    expect(await responderComFlowBot(entrada("Olá, gostaria de agendar."))).toBe(true);
    expect(enviar).toHaveBeenCalledTimes(1);
  });
});
