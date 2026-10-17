/* eslint-disable @typescript-eslint/no-explicit-any -- respostas simuladas do provedor */
import { afterEach, describe, expect, it, vi } from "vitest";

import { assistenteConfigurado, pensar } from "./assistente.server";

const contexto = {
  nome: "Aurora",
  segmento: "barbearia",
  slug: "aurora",
  whatsapp: null,
  servicos: [],
  horarios: [],
  naFila: 0,
} as any;
const JSON_OK = JSON.stringify({
  resposta: "Cadastro pronto para conferir.",
  intencao: "cadastrar_servicos",
  precisa_confirmar: true,
  pergunta_de_confirmacao: "Posso salvar?",
  destino: null,
  rotulo_do_destino: null,
  servicos: [{ nome: "Corte", categoria: "Cabelo", duracao_min: 30, preco_centavos: 4500 }],
  horarios: null,
});
const resposta = (corpo: unknown, status = 200) =>
  new Response(typeof corpo === "string" ? corpo : JSON.stringify(corpo), { status });
const completar = (conteudo: string) => ({ choices: [{ message: { content: conteudo } }] });

function gratuito() {
  vi.stubEnv("CORTAI_AI_PROVIDER", "openai_compatible");
  vi.stubEnv("CORTAI_AI_BASE_URL", "https://api.groq.exemplo.test/openai/v1");
  vi.stubEnv("CORTAI_AI_MODEL", "openai/gpt-oss-20b");
  vi.stubEnv("CORTAI_AI_API_KEY", "chave-de-teste");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fluxos estruturados do painel usam o provedor gratuito quando configurado", () => {
  it("sem provedor: indisponível; com o provedor gratuito: disponível", () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "");
    expect(assistenteConfigurado()).toBe(false);
    gratuito();
    expect(assistenteConfigurado()).toBe(true);
  });

  it("chama o provedor gratuito (URL, modelo e chave dele), nunca outro provedor", async () => {
    gratuito();
    const buscar = vi.fn(async (_u: any, _i: any) => resposta(completar(JSON_OK)));
    vi.stubGlobal("fetch", buscar);
    const r = await pensar({ mensagem: "cadastre corte de 45 reais", contexto });
    expect(String(buscar.mock.calls[0]![0])).toBe(
      "https://api.groq.exemplo.test/openai/v1/chat/completions",
    );
    const init = buscar.mock.calls[0]![1];
    expect(init.headers.authorization).toBe("Bearer chave-de-teste");
    expect(JSON.parse(init.body)).toMatchObject({
      model: "openai/gpt-oss-20b",
      response_format: { type: "json_schema" },
    });
    expect(r.servicos?.[0]).toMatchObject({ nome: "Corte", precoCentavos: 4500 });
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("provedor que não aceita json_schema estrito (400): repete pedindo JSON puro com o esquema", async () => {
    gratuito();
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(resposta("response_format não suportado", 400))
      .mockResolvedValueOnce(resposta(completar(JSON_OK)));
    vi.stubGlobal("fetch", buscar);
    const r = await pensar({ mensagem: "cadastre corte", contexto });
    expect(buscar).toHaveBeenCalledTimes(2);
    const segundo = JSON.parse(buscar.mock.calls[1]![1].body);
    expect(segundo.response_format).toEqual({ type: "json_object" });
    expect(JSON.stringify(segundo.messages.at(-1))).toMatch(/Responda SOMENTE com um objeto JSON/);
    expect(r.servicos).toHaveLength(1);
  });

  it("sem provedor independente, o assistente fica indisponível e não faz chamadas externas", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "");
    const buscar = vi.fn(async (_u: any, _i: any) => resposta(completar(JSON_OK)));
    vi.stubGlobal("fetch", buscar);
    const r = await pensar({ mensagem: "cadastre corte", contexto });
    expect(r.disponivel).toBe(false);
    expect(buscar).not.toHaveBeenCalled();
  });

  it("limite de uso do provedor gratuito (429) vira mensagem clara", async () => {
    gratuito();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => resposta("rate limit", 429)),
    );
    await expect(pensar({ mensagem: "x", contexto })).rejects.toThrow(/sobrecarregado/);
  });
});
