import { describe, expect, it } from "vitest";

import { endpointDeTranscricao } from "./transcricao.server";

/** Voz no WhatsApp: "transcrição recusada (404)" na prévia (06/11/2026). */
describe("endereço da transcrição", () => {
  it("aceita a base do .env.example e completa o caminho", () => {
    expect(endpointDeTranscricao("https://api.groq.com/openai/v1", "x")).toBe(
      "https://api.groq.com/openai/v1/audio/transcriptions",
    );
  });
  it("não duplica quando já vem completo e usa a base da IA quando vazio", () => {
    expect(endpointDeTranscricao("https://a.b/v1/audio/transcriptions/", "x")).toBe(
      "https://a.b/v1/audio/transcriptions",
    );
    expect(endpointDeTranscricao(undefined, "https://ia.exemplo/v1")).toBe(
      "https://ia.exemplo/v1/audio/transcriptions",
    );
  });
});
