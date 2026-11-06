import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  INTERVALO_DA_CONTINGENCIA_MS,
  textoDeAudioIndisponivel,
  textoDeContingencia,
} from "./contingencia";

describe("contingência do atendimento automático", () => {
  it("diz que não consegue conversar agora e manda o link do agendamento", () => {
    const t = textoDeContingencia("https://previa.cortaiapp.pages.dev/agendar/demo");
    expect(t).toContain("não estou conseguindo conversar");
    expect(t).toContain("https://previa.cortaiapp.pages.dev/agendar/demo");
    expect(t).not.toMatch(/instabilidade/i);
  });

  it("repete no máximo a cada 30 min, não uma vez por dia", () => {
    expect(INTERVALO_DA_CONTINGENCIA_MS).toBe(30 * 60_000);
    const fluxo = readFileSync("src/lib/whatsapp/fluxo.server.ts", "utf8");
    expect(fluxo).toContain("textoDeContingencia(link)");
    expect(fluxo).toContain("Date.now() - INTERVALO_DA_CONTINGENCIA_MS");
  });

  it("áudio com transcrição fora do ar pede para escrever e manda o link", () => {
    const t = textoDeAudioIndisponivel("https://x/agendar/demo");
    expect(t).toContain("Pode escrever");
    expect(t).toContain("https://x/agendar/demo");
  });
});
