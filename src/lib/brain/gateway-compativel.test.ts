/* eslint-disable @typescript-eslint/no-explicit-any -- respostas simuladas do provedor */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chamarCompativel,
  ErroDoProvedor,
  ferramentasParaChat,
  itensParaMensagens,
  lerConfigDoProvedor,
  limparMarcasInternas,
  respostaParaItens,
  type ConfigCompativel,
} from "./gateway-compativel.server";

const base = {
  CORTAI_AI_PROVIDER: "openai_compatible",
  CORTAI_AI_BASE_URL: "https://api.exemplo.test/v1/",
  CORTAI_AI_MODEL: "openai/gpt-oss-20b",
  CORTAI_AI_API_KEY: "chave-de-teste-nao-real",
};

describe("lerConfigDoProvedor", () => {
  it("sem provedor ou com valor desconhecido, fica indisponível sem fallback", () => {
    expect(lerConfigDoProvedor({})).toMatchObject({ ok: false });
    expect(lerConfigDoProvedor({ CORTAI_AI_PROVIDER: "desconhecido" })).toMatchObject({
      ok: false,
    });
  });

  it("aceita o provedor compatível completo e normaliza a URL", () => {
    const r = lerConfigDoProvedor({ ...base, CORTAI_AI_REASONING_EFFORT: "LOW" });
    expect(r.ok && r.config.tipo === "compativel" && r.config).toMatchObject({
      baseUrl: "https://api.exemplo.test/v1",
      modelo: "openai/gpt-oss-20b",
      nome: "api.exemplo.test",
      esforcoDeRaciocinio: "low",
      tempoLimiteMs: 45_000,
    });
  });

  it("configuração incompleta ou inválida NÃO cai em outro provedor", () => {
    expect(lerConfigDoProvedor({ ...base, CORTAI_AI_API_KEY: "" }).ok).toBe(false);
    expect(lerConfigDoProvedor({ ...base, CORTAI_AI_MODEL: "" }).ok).toBe(false);
    expect(lerConfigDoProvedor({ ...base, CORTAI_AI_BASE_URL: "" }).ok).toBe(false);
    expect(lerConfigDoProvedor({ ...base, CORTAI_AI_PROVIDER: "gemini" }).ok).toBe(false);
  });

  it("exige https, salvo localhost", () => {
    expect(
      lerConfigDoProvedor({ ...base, CORTAI_AI_BASE_URL: "http://api.exemplo.test/v1" }).ok,
    ).toBe(false);
    expect(
      lerConfigDoProvedor({ ...base, CORTAI_AI_BASE_URL: "http://localhost:8080/v1" }).ok,
    ).toBe(true);
    expect(lerConfigDoProvedor({ ...base, CORTAI_AI_BASE_URL: "não é url" }).ok).toBe(false);
  });

  it("o motivo do erro nunca contém a chave", () => {
    const r = lerConfigDoProvedor({ ...base, CORTAI_AI_BASE_URL: "" });
    expect(JSON.stringify(r)).not.toContain(base.CORTAI_AI_API_KEY);
  });

  it("por padrão só o painel usa o provedor novo; a lista é validada", () => {
    const r = lerConfigDoProvedor(base);
    expect(r.ok && r.config.tipo === "compativel" && r.config.canais).toEqual(["painel"]);
    const todos = lerConfigDoProvedor({ ...base, CORTAI_AI_CANAIS: "painel, Site ,whatsapp" });
    expect(todos.ok && todos.config.tipo === "compativel" && todos.config.canais).toEqual([
      "painel",
      "site",
      "whatsapp",
    ]);
    expect(lerConfigDoProvedor({ ...base, CORTAI_AI_CANAIS: "painel,telegram" }).ok).toBe(false);
    expect(lerConfigDoProvedor({ ...base, CORTAI_AI_CANAIS: "," }).ok).toBe(false);
  });

  it("limita o tempo limite a uma faixa segura", () => {
    const r = lerConfigDoProvedor({ ...base, CORTAI_AI_TIMEOUT_MS: "10" });
    expect(r.ok && r.config.tipo === "compativel" && r.config.tempoLimiteMs).toBe(45_000);
    const r2 = lerConfigDoProvedor({ ...base, CORTAI_AI_TIMEOUT_MS: "20000" });
    expect(r2.ok && r2.config.tipo === "compativel" && r2.config.tempoLimiteMs).toBe(20_000);
  });

  it("aceita fallback completo e mantém o provedor secundário separado", () => {
    const r = lerConfigDoProvedor({
      ...base,
      CORTAI_AI_FALLBACK_BASE_URL: "https://localai.exemplo.test/v1/",
      CORTAI_AI_FALLBACK_MODEL: "qwen3-4b",
      CORTAI_AI_FALLBACK_API_KEY: "chave-secundaria",
      CORTAI_AI_FALLBACK_TIMEOUT_MS: "15000",
    });
    expect(r.ok && r.config.tipo === "compativel" && r.config).toMatchObject({
      nome: "api.exemplo.test",
      modelo: "openai/gpt-oss-20b",
      fallback: {
        nome: "localai.exemplo.test",
        baseUrl: "https://localai.exemplo.test/v1",
        modelo: "qwen3-4b",
        tempoLimiteMs: 15_000,
      },
    });
    expect(JSON.stringify(r)).not.toContain("chave-secundaria");
  });

  it("fallback parcialmente configurado ou inseguro deixa a configuração indisponível", () => {
    expect(
      lerConfigDoProvedor({
        ...base,
        CORTAI_AI_FALLBACK_BASE_URL: "https://localai.exemplo.test/v1",
      }).ok,
    ).toBe(false);
    expect(
      lerConfigDoProvedor({
        ...base,
        CORTAI_AI_FALLBACK_BASE_URL: "http://localai.exemplo.test/v1",
        CORTAI_AI_FALLBACK_MODEL: "qwen3-4b",
        CORTAI_AI_FALLBACK_API_KEY: "chave-secundaria",
      }).ok,
    ).toBe(false);
  });
});

describe("tradução de formatos", () => {
  it("histórico, chamada de ferramenta e resultado viram mensagens de chat", () => {
    const m = itensParaMensagens("INSTRUÇÕES", [
      { role: "user", content: "oi" },
      { role: "assistant", content: "olá" },
      { role: "user", content: "quero cortar" },
      { type: "reasoning", id: "r1" },
      { type: "function_call", name: "listar_servicos", arguments: "{}", call_id: "c1" },
      { type: "function_call", name: "listar_profissionais", arguments: "{}", call_id: "c2" },
      { type: "function_call_output", call_id: "c1", output: '{"ok":true}' },
      { type: "function_call_output", call_id: "c2", output: '{"ok":true}' },
    ]);
    expect(m.map((x) => x.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
      "assistant",
      "tool",
      "tool",
    ]);
    expect(m[0]?.content).toBe("INSTRUÇÕES");
    expect(m[4]?.tool_calls?.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(m[5]).toMatchObject({ tool_call_id: "c1", content: '{"ok":true}' });
    expect(JSON.stringify(m)).not.toContain("r1");
  });

  it("texto do modelo antes da chamada fica na MESMA mensagem do assistente", () => {
    const m = itensParaMensagens("i", [
      { role: "user", content: "x" },
      { type: "message", role: "assistant", content: [{ type: "output_text", text: "vou ver" }] },
      { type: "function_call", name: "a", arguments: "{}", call_id: "c1" },
    ]);
    expect(m).toHaveLength(3);
    expect(m[2]).toMatchObject({ role: "assistant", content: "vou ver" });
    expect(m[2]?.tool_calls).toHaveLength(1);
  });

  it("ferramentas viram o formato de função do chat", () => {
    const f = ferramentasParaChat([
      {
        type: "function",
        name: "x",
        description: "d",
        parameters: { type: "object" },
        strict: false,
      },
    ]);
    expect(f).toEqual([
      {
        type: "function",
        function: { name: "x", description: "d", parameters: { type: "object" } },
      },
    ]);
  });

  it("converte texto e chamadas, com uso de tokens", () => {
    const { itens, uso } = respostaParaItens({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: "um instante",
            tool_calls: [
              {
                id: "abc",
                type: "function",
                function: { name: "listar_servicos", arguments: "{}" },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
    expect(itens[0]).toMatchObject({ type: "message" });
    expect(itens[1]).toEqual({
      type: "function_call",
      name: "listar_servicos",
      arguments: "{}",
      call_id: "abc",
    });
    expect(uso).toEqual({ entrada: 10, saida: 5, total: 15 });
  });

  it("gera call_id quando o provedor não manda e aceita argumentos já como objeto", () => {
    const { itens } = respostaParaItens({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [{ function: { name: "a", arguments: { x: 1 } } }],
          },
        },
      ],
    });
    expect(itens[0]).toMatchObject({ type: "function_call", arguments: '{"x":1}' });
    expect(String((itens[0] as any).call_id)).toMatch(/^call_/);
  });

  it("raciocínio e marcas de formato do GPT-OSS nunca chegam ao texto", () => {
    expect(
      limparMarcasInternas(
        "<|channel|>analysis<|message|>pensando alto<|end|><|start|>assistant<|channel|>final<|message|>Oi!<|return|>",
      ),
    ).toBe("Oi!");
    // Só raciocínio, sem resposta final: não sobra nada para o usuário.
    expect(limparMarcasInternas("<|channel|>analysis<|message|>pensando alto<|end|>")).toBe("");
    expect(limparMarcasInternas("<think>segredo</think>Olá!")).toBe("Olá!");
    expect(limparMarcasInternas("Texto normal")).toBe("Texto normal");
  });

  it("resposta cortada no meio de uma chamada de ferramenta é erro, não ação", () => {
    expect(() =>
      respostaParaItens({
        choices: [
          {
            finish_reason: "length",
            message: { tool_calls: [{ id: "1", function: { name: "a", arguments: '{"x' } }] },
          },
        ],
      }),
    ).toThrow(ErroDoProvedor);
  });

  it("resposta sem mensagem é erro", () => {
    expect(() => respostaParaItens({ choices: [] })).toThrow(ErroDoProvedor);
    expect(() => respostaParaItens(null)).toThrow(ErroDoProvedor);
  });
});

describe("chamarCompativel", () => {
  const config: ConfigCompativel = {
    tipo: "compativel",
    nome: "api.exemplo.test",
    baseUrl: "https://api.exemplo.test/v1",
    modelo: "openai/gpt-oss-20b",
    chave: "chave-de-teste-nao-real",
    tempoLimiteMs: 1_000,
    esforcoDeRaciocinio: "low",
    canais: ["painel"],
  };
  const entrada = {
    instrucoes: "i",
    entrada: [{ role: "user", content: "oi" }],
    ferramentas: [
      {
        type: "function" as const,
        name: "x",
        description: "d",
        parameters: {},
        strict: false as const,
      },
    ],
  };
  afterEach(() => vi.restoreAllMocks());

  it("monta a requisição certa e devolve itens", async () => {
    const buscar = vi.fn(
      async (_url: any, _init: any) =>
        new Response(JSON.stringify({ choices: [{ message: { content: "Oi!" } }] }), {
          status: 200,
        }),
    );
    const r = await chamarCompativel(config, entrada, buscar as any);
    const [url, init] = buscar.mock.calls[0]!;
    expect(url).toBe("https://api.exemplo.test/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer chave-de-teste-nao-real");
    const corpo = JSON.parse(init.body);
    expect(corpo).toMatchObject({
      model: "openai/gpt-oss-20b",
      stream: false,
      tool_choice: "auto",
      reasoning_effort: "low",
    });
    expect(corpo.tools).toHaveLength(1);
    expect(r.itens).toHaveLength(1);
  });

  it("sem ferramentas não manda tools nem tool_choice", async () => {
    const buscar = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
          status: 200,
        }),
    );
    await chamarCompativel(config, { ...entrada, ferramentas: [] }, buscar as any);
    const corpo = JSON.parse((buscar.mock.calls[0] as any)[1].body);
    expect(corpo.tools).toBeUndefined();
    expect(corpo.tool_choice).toBeUndefined();
  });

  it("repassa o status do provedor sem vazar a chave no log", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const buscar = vi.fn(async () => new Response("quota", { status: 429 }));
    await expect(chamarCompativel(config, entrada, buscar as any)).rejects.toMatchObject({
      status: 429,
    });
    expect(JSON.stringify(erro.mock.calls)).not.toContain(config.chave);
  });

  it("estouro de tempo vira 504 e falha de rede vira 502", async () => {
    const lento = vi.fn(
      (_u: any, init: any) =>
        new Promise((_res, rej) =>
          init.signal.addEventListener("abort", () => rej(new Error("abort"))),
        ),
    );
    await expect(
      chamarCompativel({ ...config, tempoLimiteMs: 20 }, entrada, lento as any),
    ).rejects.toMatchObject({ status: 504 });
    const cai = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    await expect(chamarCompativel(config, entrada, cai as any)).rejects.toMatchObject({
      status: 502,
    });
  });
});
