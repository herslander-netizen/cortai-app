import { describe, expect, it, vi, afterEach } from "vitest";
import {
  candidatosElegiveis, escolherProvedorHibrido, type CandidatoHibrido,
} from "./roteador-hibrido";
import {
  chamarRoteadorHibrido, lerProvedoresHibridos,
} from "./gateway-hibrido.server";

const base = (id: CandidatoHibrido["id"], modelo = "modelo-free"): CandidatoHibrido => ({
  id, modelo, habilitado: true, conectado: true,
  modalidadeGratuitaVerificada: true, suportaFerramentas: true,
  canais: ["painel", "whatsapp", "site"],
  tarefas: ["faq", "classificacao", "conversa", "extracao"],
});
const s = {
  canal: "whatsapp" as const, tarefa: "conversa" as const,
  dados: "publico" as const, exigeFerramentas: true, anonimizadoDeFormaVerificada: false,
};
const candidatos = [base("gemini"), base("ollama"), base("groq"), base("openrouter", "x:free")];
const cotas = Object.fromEntries(["ollama", "groq", "gemini", "openrouter"].map((id) => [
  id, { chaveId: id, minuto: 20, dia: 50 },
]));
const ctx = (patch: Record<string, unknown> = {}) => ({
  solicitacao: s, candidatos, ligado: true, idempotencia: "t123",
  cotas, limitador: { reservar: async () => true }, ...patch,
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Flow Core — política híbrida", () => {
  it("desligado bloqueia", async () => {
    expect((await escolherProvedorHibrido(ctx({ ligado: false }))).tipo).toBe("contingencia");
  });
  it("conversa pública prioriza Groq", async () => {
    expect(await escolherProvedorHibrido(ctx())).toEqual({
      tipo: "modelo", provedor: "groq", modelo: "modelo-free",
    });
  });
  it("dado pessoal ou confidencial fica no Ollama", () => {
    for (const dados of ["pessoal", "confidencial"] as const) {
      expect(candidatosElegiveis({ ...s, dados }, candidatos, true).map((c) => c.id)).toEqual(["ollama"]);
    }
  });
  it("sem Ollama, dados pessoais não caem em nuvem", async () => {
    expect((await escolherProvedorHibrido(ctx({
      candidatos: candidatos.filter((c) => c.id !== "ollama"),
      solicitacao: { ...s, dados: "pessoal" },
    }))).tipo).toBe("contingencia");
  });
  it("anonimização duvidosa não libera nuvem", () => {
    expect(candidatosElegiveis({ ...s, dados: "anonimizado" }, candidatos, true).map((c) => c.id)).toEqual(["ollama"]);
  });
  it("anonimização verificada libera provedores elegíveis", () => {
    expect(candidatosElegiveis({
      ...s, dados: "anonimizado", anonimizadoDeFormaVerificada: true,
    }, candidatos, true).some((c) => c.id === "groq")).toBe(true);
  });
  it("OpenRouter bloqueia modelo pago", () => {
    expect(candidatosElegiveis(s, [base("openrouter", "pago")], true)).toEqual([]);
  });
  it("gratuidade exige verificação, mesmo no Ollama", () => {
    expect(candidatosElegiveis(s, [{ ...base("ollama"), modalidadeGratuitaVerificada: false }], true)).toEqual([]);
  });
  it("sem limitador não faz chamada", async () => {
    expect((await escolherProvedorHibrido(ctx({ limitador: null }))).tipo).toBe("contingencia");
  });
  it("exceção no limitador bloqueia fallback", async () => {
    const reservar = vi.fn(async () => { throw new Error("sem cota"); });
    expect((await escolherProvedorHibrido(ctx({ limitador: { reservar } }))).tipo).toBe("contingencia");
    expect(reservar).toHaveBeenCalledTimes(1);
  });
  it("cota esgotada aciona contingência", async () => {
    expect((await escolherProvedorHibrido(ctx({ limitador: { reservar: async () => false } }))).tipo).toBe("contingencia");
  });
  it("modelo sem tool calling não recebe solicitação com ferramentas", () => {
    expect(candidatosElegiveis(s, [{ ...base("groq"), suportaFerramentas: false }], true)).toEqual([]);
  });
  it("configuração ambígua com duplicatas bloqueia", () => {
    expect(candidatosElegiveis(s, [base("groq"), base("groq")], true)).toEqual([]);
  });
  it("idempotência obrigatória", async () => {
    expect((await escolherProvedorHibrido(ctx({ idempotencia: "" }))).tipo).toBe("contingencia");
  });
  it("reserva antes de enviar", async () => {
    const reservar = vi.fn(async () => true);
    const r = await escolherProvedorHibrido(ctx({ limitador: { reservar } }));
    expect(r.tipo).toBe("modelo");
    expect(reservar).toHaveBeenCalledWith(expect.objectContaining({
      provedor: "groq", chaveId: "groq", idempotencia: "t123:groq", janelaDiaMax: 50,
    }));
  });
});

const cfg = [{
  id: "groq", modelo: "modelo-free", habilitado: true,
  modalidadeGratuitaVerificada: true, suportaFerramentas: true,
  canais: ["painel"], tarefas: ["conversa"],
  baseUrl: "https://api.groq.com/openai/v1", minuto: 10, dia: 50, tempoLimiteMs: 1000,
}];
const entrada = {
  instrucoes: "i",
  entrada: [{ role: "user", content: "oi" }],
  ferramentas: [{ type: "function" as const, name: "listar_servicos", description: "d", parameters: {}, strict: false as const }],
};

describe("Flow Core — integração opcional do gateway", () => {
  it("sem flag nenhuma configuração híbrida é aceita", () => {
    vi.stubEnv("CORTAI_AI_HIBRIDO", "false");
    vi.stubEnv("CORTAI_AI_HIBRIDO_CONFIG", JSON.stringify(cfg));
    expect(lerProvedoresHibridos()).toEqual([]);
  });
  it("sem chave, configuração não é aceita", () => {
    vi.stubEnv("CORTAI_AI_HIBRIDO", "true");
    vi.stubEnv("CORTAI_AI_HIBRIDO_CONFIG", JSON.stringify(cfg));
    vi.stubEnv("CORTAI_AI_HIBRIDO_GROQ_API_KEY", "");
    expect(lerProvedoresHibridos()).toEqual([]);
  });
  it("host remoto não pode ser desviado", () => {
    vi.stubEnv("CORTAI_AI_HIBRIDO", "true");
    vi.stubEnv("CORTAI_AI_HIBRIDO_CONFIG", JSON.stringify([{ ...cfg[0], baseUrl: "https://host.invalido/v1" }]));
    vi.stubEnv("CORTAI_AI_HIBRIDO_GROQ_API_KEY", "teste");
    expect(lerProvedoresHibridos()).toEqual([]);
  });
  it("Ollama sem origem privada fixada não recebe dados de clientes", () => {
    vi.stubEnv("CORTAI_AI_HIBRIDO", "true");
    vi.stubEnv("CORTAI_AI_HIBRIDO_CONFIG", JSON.stringify([{ ...cfg[0],
      id: "ollama", baseUrl: "https://ollama.com/v1" }]));
    vi.stubEnv("CORTAI_AI_HIBRIDO_OLLAMA_API_KEY", "teste");
    vi.stubEnv("CORTAI_AI_HIBRIDO_OLLAMA_ORIGIN", "https://ollama.com");
    expect(lerProvedoresHibridos()).toEqual([]);
    vi.stubEnv("CORTAI_AI_HIBRIDO_CONFIG", JSON.stringify([{ ...cfg[0],
      id: "ollama", baseUrl: "https://privado.exemplo.test/v1" }]));
    vi.stubEnv("CORTAI_AI_HIBRIDO_OLLAMA_ORIGIN", "");
    expect(lerProvedoresHibridos()).toEqual([]);
    vi.stubEnv("CORTAI_AI_HIBRIDO_OLLAMA_ORIGIN", "https://privado.exemplo.test");
    expect(lerProvedoresHibridos()).toHaveLength(1);
  });
  it("sem reserva global não faz chamada, mesmo com credenciais", async () => {
    vi.stubEnv("CORTAI_AI_HIBRIDO", "true");
    vi.stubEnv("CORTAI_AI_HIBRIDO_CONFIG", JSON.stringify(cfg));
    vi.stubEnv("CORTAI_AI_HIBRIDO_GROQ_API_KEY", "teste");
    const buscar = vi.fn();
    vi.stubGlobal("fetch", buscar);
    await expect(chamarRoteadorHibrido(entrada, {
      canal: "painel", tarefa: "conversa", dados: "publico",
      anonimizadoDeFormaVerificada: false, idempotencia: "t1", limitador: null,
    })).rejects.toMatchObject({ status: 429 });
    expect(buscar).not.toHaveBeenCalled();
  });
  it("em ambiente simulado reserva e chama a API compatível", async () => {
    vi.stubEnv("CORTAI_AI_HIBRIDO", "true");
    vi.stubEnv("CORTAI_AI_HIBRIDO_CONFIG", JSON.stringify(cfg));
    vi.stubEnv("CORTAI_AI_HIBRIDO_GROQ_API_KEY", "teste");
    const ordem: string[] = [];
    const buscar = vi.fn(async () => {
      ordem.push("fetch");
      return new Response(JSON.stringify({ choices: [{ message: { content: "Olá!" } }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", buscar);
    const r = await chamarRoteadorHibrido(entrada, {
      canal: "painel", tarefa: "conversa", dados: "publico",
      anonimizadoDeFormaVerificada: false, idempotencia: "t1",
      limitador: { reservar: async () => { ordem.push("reserva"); return true; } },
    });
    expect(ordem).toEqual(["reserva", "fetch"]);
    expect(r.itens[0]).toMatchObject({ type: "message" });
  });
});
