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

describe("barreira final de consentimento", () => {
  it("o ponto único de envio confere o consentimento de todo aviso iniciado pelo negócio", () => {
    const envio = fluxo.slice(fluxo.indexOf("export async function enviarPelaBarbearia"));
    const corpo = envio.slice(0, 3000);
    expect(corpo).toContain("if (input.iniciadaPelaBarbearia)");
    expect(corpo).toContain("Aviso sem finalidade de consentimento declarada.");
    expect(corpo).toContain("verificarConsentimentoWhatsapp");
  });

  it("todo remetente de aviso declara a finalidade (ou 'equipe') junto de iniciadaPelaBarbearia", () => {
    const arquivos = [
      "src/lib/whatsapp/aviso-atraso.server.ts",
      "src/lib/whatsapp/notificacoes.server.ts",
      "src/lib/whatsapp/fila-ofertas.server.ts",
      "src/lib/whatsapp/aviso-equipe-whatsapp.server.ts",
    ];
    for (const caminho of arquivos) {
      const texto = readFileSync(caminho, "utf8");
      const usos = texto.split("iniciadaPelaBarbearia: true,").slice(1);
      expect(usos.length, caminho).toBeGreaterThan(0);
      for (const depois of usos) expect(depois.slice(0, 120), caminho).toContain("consentimento:");
    }
  });
});
