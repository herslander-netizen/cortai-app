import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { avisoDePedidoDeAtendimento, ehLinkDoWhatsApp } from "./pedido-de-atendimento";

/** Aviso "Cliente pediu atendimento" abre o WhatsApp do cliente (dono, 06/11/2026). */
describe("aviso de pedido de atendimento", () => {
  it("toque abre a conversa com o cliente e o corpo mostra o telefone legível", () => {
    const a = avisoDePedidoDeAtendimento("557991787208", "Falar com alguém");
    expect(a._link).toBe("https://wa.me/557991787208");
    expect(a._corpo).toBe('+55 79 9178-7208: "Falar com alguém"');
    expect(a._titulo).toBe("Cliente pediu atendimento");
  });

  it("telefone sem DDI ganha o 55; número inválido volta para o painel", () => {
    expect(avisoDePedidoDeAtendimento("79991787208", "oi")._link).toBe(
      "https://wa.me/5579991787208",
    );
    expect(avisoDePedidoDeAtendimento("123", "oi")._link).toBe("/barbeiro");
  });

  it("Flow Bot e Flow IA usam o mesmo formato; WhatsApp abre fora do app em todo lugar", () => {
    for (const f of ["src/lib/whatsapp/fluxo.server.ts", "src/lib/flow-bot/bot.server.ts"]) {
      const s = readFileSync(f, "utf8");
      expect(s).toContain("...avisoDePedidoDeAtendimento(input.telefone, input.texto)");
      expect(s).not.toContain('_titulo: "Cliente pediu atendimento"');
    }
    expect(readFileSync("src/lib/pwa/service-worker.ts", "utf8")).toContain(
      'if (link.indexOf("https://wa.me/") === 0) return self.clients.openWindow(link);',
    );
    expect(readFileSync("src/lib/avisos-do-navegador.ts", "utf8")).toContain(
      'link?.startsWith("https://wa.me/")',
    );
    expect(ehLinkDoWhatsApp("https://wa.me/5579")).toBe(true);
    expect(ehLinkDoWhatsApp("/barbeiro")).toBe(false);
  });
});
