import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  INTERVALO_DA_CONTINGENCIA_MS,
  textoDeAudioIndisponivel,
  textoDeContingencia,
} from "./contingencia";

describe("contingência do atendimento automático", () => {
  it("diz que não consegue conversar agora e manda o link do agendamento", () => {
    const t = textoDeContingencia(
      "https://previa.cortaiapp.pages.dev/agendar/demo",
      "Ricardo Alves",
    );
    expect(t).toContain("Ricardo não está conseguindo responder no momento.");
    expect(t).toContain("Já avisamos que você quer falar");
    expect(t).toContain(
      "veja um horário disponível na agenda: https://previa.cortaiapp.pages.dev/agendar/demo",
    );
    const semNome = textoDeContingencia("https://x/agendar/demo", null);
    expect(semNome).toContain("A equipe não está conseguindo responder no momento.");
    expect(semNome).toContain("alguém da equipe entra em contato");
    expect(t).not.toMatch(/instabilidade/i);
  });

  it("repete no máximo a cada 30 min, não uma vez por dia", () => {
    expect(INTERVALO_DA_CONTINGENCIA_MS).toBe(30 * 60_000);
    const fluxo = readFileSync("src/lib/whatsapp/fluxo.server.ts", "utf8");
    expect(fluxo).toContain("textoDeContingencia(link, await responsavelDoNegocio(tenantId))");
    expect(fluxo).toContain(
      "await avisarEquipeDaContingencia({ tenantId, telefone, texto: textoDoTurno })",
    );
    expect(fluxo).toContain("Date.now() - INTERVALO_DA_CONTINGENCIA_MS");
  });

  it("áudio com transcrição fora do ar pede para escrever e manda o link", () => {
    const t = textoDeAudioIndisponivel("https://x/agendar/demo", "Ricardo");
    expect(t).toContain("Ricardo já foi avisado");
    expect(t).toContain("escreva sua mensagem");
    expect(t).toContain("https://x/agendar/demo");
  });
  it("nome com cara de usuário vira 'a equipe'; nome de pessoa ganha maiúscula", async () => {
    const { quemResponde } = await import("./contingencia");
    expect(quemResponde("falecomaalvo").nome).toBe("a equipe");
    expect(quemResponde("joao_123").nome).toBe("a equipe");
    expect(quemResponde("ricardo").nome).toBe("Ricardo");
    expect(quemResponde("Ricardo Alves").nome).toBe("Ricardo");
  });
});
