/* eslint-disable @typescript-eslint/no-explicit-any -- respostas simuladas do provedor */
import { afterEach, describe, expect, it, vi } from "vitest";

const ferramentas = [
  {
    type: "function" as const,
    name: "listar_servicos",
    description: "d",
    parameters: { type: "object" },
    strict: false as const,
  },
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("gateway central — escolha do provedor", () => {
  it("sem provedor configurado, fica indisponível", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "");
    const g = await import("./gateway.server");
    expect(g.identidadeDoModelo()).toEqual({
      provedor: "não configurado",
      modelo: g.MODELO_CORTAI,
    });
    expect(g.iaDisponivel()).toBe(false);
    expect(g.iaDisponivel()).toBe(false);
  });

  it("provedor compatível completo fica disponível", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "openai_compatible");
    vi.stubEnv("CORTAI_AI_BASE_URL", "https://api.exemplo.test/v1");
    vi.stubEnv("CORTAI_AI_MODEL", "openai/gpt-oss-20b");
    vi.stubEnv("CORTAI_AI_API_KEY", "chave-de-teste");
    const g = await import("./gateway.server");
    expect(g.iaDisponivel()).toBe(true);
    expect(g.identidadeDoModelo()).toEqual({
      provedor: "api.exemplo.test",
      modelo: "openai/gpt-oss-20b",
    });
  });

  it("configuração inválida não cai em outro provedor: fica indisponível e responde 401 seguro", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "openai_compatible");
    vi.stubEnv("CORTAI_AI_BASE_URL", "");
    vi.stubEnv("CORTAI_AI_MODEL", "");
    vi.stubEnv("CORTAI_AI_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchEspiao = vi.fn();
    vi.stubGlobal("fetch", fetchEspiao);
    const g = await import("./gateway.server");
    expect(g.iaDisponivel()).toBe(false);
    await expect(
      g.criarSessaoDoGateway().responder({ instrucoes: "i", entrada: [], ferramentas }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchEspiao).not.toHaveBeenCalled();
  });

  it("usa o provedor compatível, devolve itens e avisa a observabilidade (sem lançar se ela falhar)", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "openai_compatible");
    vi.stubEnv("CORTAI_AI_BASE_URL", "https://api.exemplo.test/v1");
    vi.stubEnv("CORTAI_AI_MODEL", "openai/gpt-oss-20b");
    vi.stubEnv("CORTAI_AI_API_KEY", "chave-de-teste");
    const fetchSimulado = vi.fn(
      async (_u: any, _i: any) =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    { id: "c1", function: { name: "listar_servicos", arguments: "{}" } },
                  ],
                },
              },
            ],
            usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchSimulado);
    const g = await import("./gateway.server");
    const eventos: any[] = [];
    const itens = await g
      .criarSessaoDoGateway({
        aoChamar: (e) => (
          eventos.push(e),
          (() => {
            throw new Error("obs quebrou");
          })()
        ),
      })
      .responder({ instrucoes: "i", entrada: [{ role: "user", content: "oi" }], ferramentas });
    expect(itens).toEqual([
      { type: "function_call", name: "listar_servicos", arguments: "{}", call_id: "c1" },
    ]);
    expect(eventos[0]).toMatchObject({
      ok: true,
      modelo: "openai/gpt-oss-20b",
      ferramentas: ["listar_servicos"],
      uso: { entrada: 7, saida: 3, total: 10 },
    });
    expect(String(fetchSimulado.mock.calls[0]![0])).toBe(
      "https://api.exemplo.test/v1/chat/completions",
    );
  });

  it("402 e 403 do provedor compatível continuam pausando a IA (semCredito)", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "openai_compatible");
    vi.stubEnv("CORTAI_AI_BASE_URL", "https://api.exemplo.test/v1");
    vi.stubEnv("CORTAI_AI_MODEL", "m");
    vi.stubEnv("CORTAI_AI_API_KEY", "k");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("sem crédito", { status: 402 })),
    );
    const g = await import("./gateway.server");
    const eventos: any[] = [];
    const erro: any = await g
      .criarSessaoDoGateway({ aoChamar: (e) => eventos.push(e) })
      .responder({ instrucoes: "i", entrada: [], ferramentas })
      .catch((e) => e);
    expect(erro.semCredito).toBe(true);
    // A pausa por crédito precisa saber QUEM recusou (um provedor não herda a pausa de outro).
    expect(erro.provedor).toBe("api.exemplo.test");
    expect(erro.message).not.toContain("sem crédito");
    expect(eventos[0]).toMatchObject({ ok: false, httpStatus: 402 });
  });

  it("migração por canal: só os canais listados usam o provedor; os demais ficam indisponíveis", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "openai_compatible");
    vi.stubEnv("CORTAI_AI_BASE_URL", "https://api.exemplo.test/v1");
    vi.stubEnv("CORTAI_AI_MODEL", "openai/gpt-oss-20b");
    vi.stubEnv("CORTAI_AI_API_KEY", "chave-de-teste");
    const g = await import("./gateway.server");
    // Padrão: só o painel.
    expect(g.identidadeDoModelo("painel").modelo).toBe("openai/gpt-oss-20b");
    expect(g.identidadeDoModelo("whatsapp")).toEqual({
      provedor: "não configurado",
      modelo: g.MODELO_CORTAI,
    });
    expect(g.identidadeDoModelo("site").provedor).toBe("não configurado");
    // Ampliar a lista move os outros canais; canais não listados não têm fallback.
    vi.stubEnv("CORTAI_AI_CANAIS", "painel,site");
    expect(g.identidadeDoModelo("site").modelo).toBe("openai/gpt-oss-20b");
    expect(g.identidadeDoModelo("whatsapp").provedor).toBe("não configurado");
    vi.stubEnv("CORTAI_AI_PROVIDER", "");
    expect(g.identidadeDoModelo("painel")).toEqual({
      provedor: "não configurado",
      modelo: g.MODELO_CORTAI,
    });
  });

  it("canal fora da lista não chama provedor algum", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "openai_compatible");
    vi.stubEnv("CORTAI_AI_BASE_URL", "https://api.exemplo.test/v1");
    vi.stubEnv("CORTAI_AI_MODEL", "m");
    vi.stubEnv("CORTAI_AI_API_KEY", "k");
    vi.stubEnv("CORTAI_AI_CANAIS", "painel");
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: unknown) => {
        urls.push(String(u));
        return new Response("", { status: 500 });
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const g = await import("./gateway.server");
    await g
      .criarSessaoDoGateway({ canal: "whatsapp" })
      .responder({ instrucoes: "i", entrada: [], ferramentas })
      .catch(() => undefined);
    await g
      .criarSessaoDoGateway({ canal: "painel" })
      .responder({ instrucoes: "i", entrada: [], ferramentas })
      .catch(() => undefined);
    expect(urls).toEqual(["https://api.exemplo.test/v1/chat/completions"]);
  });
});
