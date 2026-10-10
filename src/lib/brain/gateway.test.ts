import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErroDoGateway, criarSessaoDoGateway, textoDaSaida } from "./gateway.server";

/** Resposta SSE como o Lovable AI Gateway devolve (Responses API em streaming). */
function sse(eventos: unknown[], headers: Record<string, string> = {}) {
  const corpo = eventos.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(corpo, { status: 200, headers });
}

const mensagem = (texto: string) => ({
  type: "message",
  content: [{ type: "output_text", text: texto }],
});

const chamadas: { url: string; init: RequestInit }[] = [];
let respostas: Response[] = [];

beforeEach(() => {
  chamadas.length = 0;
  respostas = [];
  vi.stubEnv("LOVABLE_API_KEY", "chave-de-teste");
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    chamadas.push({ url, init });
    const r = respostas.shift();
    if (!r) throw new Error("sem resposta simulada");
    return r;
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const entrada = { instrucoes: "x", entrada: [{ role: "user", content: "oi" }], ferramentas: [] };

describe("gateway da CortAI", () => {
  it("lê o stream até response.completed e devolve o texto final", async () => {
    respostas.push(
      sse([
        { type: "response.output_text.delta", delta: "Ol" },
        { type: "response.completed", response: { output: [mensagem("Olá!")] } },
      ]),
    );
    const saida = await criarSessaoDoGateway().responder(entrada);
    expect(textoDaSaida(saida)).toBe("Olá!");
    const corpo = JSON.parse(String(chamadas[0]?.init.body));
    expect(corpo.stream).toBe(true);
    expect(corpo.store).toBe(false);
    expect(new Headers(chamadas[0]?.init.headers).get("Lovable-API-Key")).toBe("chave-de-teste");
  });

  it("sem response.completed, usa os itens concluídos", async () => {
    respostas.push(sse([{ type: "response.output_item.done", item: mensagem("Parcial") }]));
    expect(textoDaSaida(await criarSessaoDoGateway().responder(entrada))).toBe("Parcial");
  });

  it("reaproveita o id de execução do gateway nos passos seguintes, sem criar um próprio", async () => {
    respostas.push(
      sse([{ type: "response.completed", response: { output: [] } }], {
        "X-Lovable-AIG-Run-ID": "run-123",
      }),
      sse([{ type: "response.completed", response: { output: [] } }]),
    );
    const sessao = criarSessaoDoGateway();
    await sessao.responder(entrada);
    await sessao.responder(entrada);
    expect(new Headers(chamadas[0]?.init.headers).get("X-Lovable-AIG-Run-ID")).toBeNull();
    expect(new Headers(chamadas[1]?.init.headers).get("X-Lovable-AIG-Run-ID")).toBe("run-123");
  });

  it("402 vira erro sem crédito (pausa a IA) com mensagem segura", async () => {
    respostas.push(new Response("payment required: detalhes internos", { status: 402 }));
    const erro = await criarSessaoDoGateway()
      .responder(entrada)
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDoGateway);
    expect((erro as ErroDoGateway).semCredito).toBe(true);
    expect((erro as Error).message).not.toContain("detalhes internos");
  });

  it("429 é transitório, não pausa", async () => {
    respostas.push(new Response("", { status: 429 }));
    const erro = (await criarSessaoDoGateway()
      .responder(entrada)
      .catch((e: unknown) => e)) as ErroDoGateway;
    expect(erro.status).toBe(429);
    expect(erro.semCredito).toBe(false);
  });

  it("falha no meio do stream vira erro, nunca resposta vazia aceita", async () => {
    respostas.push(sse([{ type: "response.failed" }]));
    await expect(criarSessaoDoGateway().responder(entrada)).rejects.toBeInstanceOf(ErroDoGateway);
  });

  it("sem chave no ambiente, não chama a rede", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "");
    await expect(criarSessaoDoGateway().responder(entrada)).rejects.toMatchObject({ status: 401 });
    expect(chamadas).toHaveLength(0);
  });
});
