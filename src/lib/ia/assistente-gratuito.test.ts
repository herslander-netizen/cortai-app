/* eslint-disable @typescript-eslint/no-explicit-any -- respostas simuladas do provedor */
import { afterEach, describe, expect, it, vi } from "vitest";

import { assistenteConfigurado, extrairCadastroEstruturado } from "./assistente.server";

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

  it("chama o gateway central com URL, modelo e chave do provedor configurado", async () => {
    gratuito();
    const buscar = vi.fn(async (_u: any, _i: any) => resposta(completar(JSON_OK)));
    vi.stubGlobal("fetch", buscar);
    const r = await extrairCadastroEstruturado({ mensagem: "cadastre corte de 45 reais", contexto });
    expect(String(buscar.mock.calls[0]![0])).toBe(
      "https://api.groq.exemplo.test/openai/v1/chat/completions",
    );
    const init = buscar.mock.calls[0]![1];
    expect(init.headers.Authorization).toBe("Bearer chave-de-teste");
    expect(JSON.parse(init.body)).toMatchObject({
      model: "openai/gpt-oss-20b",
    });
    expect(JSON.stringify(JSON.parse(init.body).messages)).toMatch(/objeto JSON válido/);
    expect(r.servicos?.[0]).toMatchObject({ nome: "Corte", precoCentavos: 4500 });
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("erro de formato do provedor não abre um segundo caminho fora do gateway", async () => {
    gratuito();
    const buscar = vi.fn().mockResolvedValueOnce(resposta("response_format não suportado", 400));
    vi.stubGlobal("fetch", buscar);
    await expect(extrairCadastroEstruturado({ mensagem: "cadastre corte", contexto })).rejects.toThrow(
      /não conseguiu responder|IA do Flow/i,
    );
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("sem provedor independente, o assistente fica indisponível e não faz chamadas externas", async () => {
    vi.stubEnv("CORTAI_AI_PROVIDER", "");
    const buscar = vi.fn(async (_u: any, _i: any) => resposta(completar(JSON_OK)));
    vi.stubGlobal("fetch", buscar);
    const r = await extrairCadastroEstruturado({ mensagem: "cadastre corte", contexto });
    expect(r.disponivel).toBe(false);
    expect(buscar).not.toHaveBeenCalled();
  });

  it("limite de uso do provedor gratuito (429) vira mensagem clara", async () => {
    gratuito();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => resposta("rate limit", 429)),
    );
    await expect(extrairCadastroEstruturado({ mensagem: "x", contexto })).rejects.toThrow(/sobrecarregada/);
  });
});
