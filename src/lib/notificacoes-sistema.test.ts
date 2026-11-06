import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ehAvisoDeSistema, TIPOS_DE_SISTEMA } from "./notificacoes";

/** Configuração do sistema no menu lateral; o resto no sininho (dono, 06/11/2026). */
describe("avisos de sistema x sininho", () => {
  it("conexão do WhatsApp, alerta da plataforma e teste são de sistema; a operação não", () => {
    for (const t of ["whatsapp_conexao", "whatsapp_do_negocio_caiu", "alerta_admin", "teste"])
      expect(ehAvisoDeSistema({ tipo: t }), t).toBe(true);
    for (const t of [
      "agendamento_novo",
      "agendamento_cancelado",
      "fila",
      "pix",
      "whatsapp_humano",
      "whatsapp_falhou",
    ])
      expect(ehAvisoDeSistema({ tipo: t }), t).toBe(false);
    expect(TIPOS_DE_SISTEMA.size).toBe(4);
  });

  it("o sininho filtra os de sistema e o menu lateral mostra os não lidos", () => {
    const sino = readFileSync("src/components/notificacoes/SinoDeAvisos.tsx", "utf8");
    expect(sino).toContain("(avisos ?? []).filter((a) => !ehAvisoDeSistema(a))");
    const menu = readFileSync("src/components/layout/DrawerDestaques.tsx", "utf8");
    expect(menu).toContain("<AvisosDoSistemaNoMenu tenantId={tenantId} fechar={fechar} />");
    const cartao = readFileSync("src/components/layout/AvisosDoSistemaNoMenu.tsx", "utf8");
    expect(cartao).toContain("ehAvisoDeSistema(a) && !a.lida_em");
    // "Ler todos" do sininho não apaga os avisos do menu.
    expect(readFileSync("src/lib/notificacoes.ts", "utf8")).toContain('.not("tipo", "in"');
  });
});
