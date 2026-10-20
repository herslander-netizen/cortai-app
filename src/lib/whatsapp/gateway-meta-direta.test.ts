import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { credenciaisFaltantes, gatewayDoProvedor } from "./gateway.server";

type Chamada = { url: string; init: RequestInit };

function capturarFetch(resposta: unknown) {
  const chamadas: Chamada[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      chamadas.push({ url, init });
      return new Response(JSON.stringify(resposta), { status: 200 });
    }),
  );
  return chamadas;
}

describe("WhatsApp oficial direto na Cloud API da Meta", () => {
  beforeEach(() => {
    vi.stubEnv("META_WHATSAPP_ACCESS_TOKEN", "token-de-teste");
    vi.stubEnv("META_WHATSAPP_PHONE_NUMBER_ID", "123456");
    vi.stubEnv("WHATSAPP_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envia texto para graph.facebook.com com o token da Meta, sem intermediário", async () => {
    const chamadas = capturarFetch({ messages: [{ id: "wamid.1" }] });
    const r = await gatewayDoProvedor("meta").enviarMensagem("s", "+55 (11) 98888-7777", "Olá");
    expect(r).toEqual({ id: "wamid.1" });
    expect(chamadas[0]?.url).toBe("https://graph.facebook.com/v21.0/123456/messages");
    const cabecalhos = chamadas[0]?.init.headers as Record<string, string>;
    expect(cabecalhos["authorization"]).toBe("Bearer token-de-teste");
    expect(cabecalhos["x-connection-api-key"]).toBeUndefined();
    expect(JSON.parse(String(chamadas[0]?.init.body))).toMatchObject({
      messaging_product: "whatsapp",
      to: "5511988887777",
      type: "text",
    });
  });

  it("consulta o número no próprio recurso do número e respeita META_GRAPH_VERSION", async () => {
    vi.stubEnv("META_GRAPH_VERSION", "v22.0");
    const chamadas = capturarFetch({ display_phone_number: "+55 11 4000-0000" });
    const estado = await gatewayDoProvedor("meta").consultarStatus("s");
    expect(estado.status).toBe("conectado");
    expect(estado.numero).toBe("+55 11 4000-0000");
    expect(chamadas[0]?.url).toBe(
      "https://graph.facebook.com/v22.0/123456?fields=display_phone_number,quality_rating",
    );
  });

  it("botões e templates ficam disponíveis e nenhuma credencial do Evolution é exigida", () => {
    expect(gatewayDoProvedor("meta").capacidades()).toEqual({
      botoes: true,
      exigeTemplateForaDaJanela: true,
    });
    expect(credenciaisFaltantes()).toEqual([]);
  });

  it("sem token direto e sem o conector antigo, a conta oficial não está configurada", () => {
    vi.stubEnv("META_WHATSAPP_ACCESS_TOKEN", "");
    expect(gatewayDoProvedor("meta").provedor()).toBeNull();
  });
});
