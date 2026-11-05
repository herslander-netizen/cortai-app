import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Guardas de arquitetura do atendimento (prompt master, 05/11/2026): quebram se alguém desfizer as decisões. */
const fluxo = readFileSync("src/lib/whatsapp/fluxo.server.ts", "utf8");

describe("atendimento pelo WhatsApp", () => {
  it("toda mensagem livre passa pelo padrão de formatação no ponto único de envio", () => {
    const envio = fluxo.slice(fluxo.indexOf("export async function enviarPelaBarbearia"));
    expect(envio.slice(0, 1500)).toContain("paraWhatsApp(input.texto)");
  });

  it("Flow Bot e Flow IA recebem o mesmo texto do turno (mensagens picadas juntadas)", () => {
    const bot = fluxo.indexOf("responderComFlowBot({");
    const ia = fluxo.indexOf("responderComCerebro({", bot);
    expect(fluxo.slice(bot, bot + 400)).toContain("texto: textoDoTurno");
    expect(fluxo.slice(ia, ia + 400)).toContain("texto: textoDoTurno");
  });

  it("uma decisão por mensagem: o Bot respondeu, a IA não roda", () => {
    const depoisDoBot = fluxo.slice(fluxo.indexOf("responderComFlowBot({"));
    expect(
      depoisDoBot.indexOf('if (peloBot) return { tratada: true, motivo: "flow_bot" }'),
    ).toBeLessThan(depoisDoBot.indexOf("responderComCerebro({"));
  });
});
