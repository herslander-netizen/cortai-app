import { describe, expect, it } from "vitest";
import { falhaPermiteFallback, modeloWorkersAiRetirado } from "./politica-fallback";

describe("Flow Core — contingência de modelos", () => {
  it("reconhece a retirada oficial do Workers AI sem consultar a API", () => {
    expect(modeloWorkersAiRetirado("workers_ai", "@cf/qwen/qwq-32b")).toBe(true);
    expect(modeloWorkersAiRetirado("api.cloudflare.com", "@cf/meta/llama-3.2-3b-instruct")).toBe(true);
    expect(modeloWorkersAiRetirado("api.cloudflare.com", "@cf/openai/whisper-tiny-en")).toBe(true);
    expect(modeloWorkersAiRetirado("api.cloudflare.com", "@cf/qwen/qwen3.8-27b")).toBe(false);
    expect(modeloWorkersAiRetirado("groq", "@cf/qwen/qwq-32b")).toBe(false);
  });

  it("410/429/5xx permitem trocar apenas para alternativa já configurada", () => {
    for (const status of [410, 429, 500, 502, 503, 504]) {
      expect(falhaPermiteFallback(status)).toBe(true);
    }
  });

  it("bloqueios, falta de crédito e entradas inválidas não acionam fallback", () => {
    for (const status of [400, 401, 402, 403, 404, 408, 422, 499, 600]) {
      expect(falhaPermiteFallback(status)).toBe(false);
    }
  });
});
