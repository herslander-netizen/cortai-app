import { describe, expect, it } from "vitest";
import { CONFIG_INICIAL_WHATSAPP, devePrepararAtendimento } from "./ativacao-padrao.server";

describe("atendimento padrão ao conectar WhatsApp", () => {
  it("liga atendimento, IA, confirmações e lembretes na primeira conexão", () => {
    expect(CONFIG_INICIAL_WHATSAPP).toMatchObject({
      atendimento_automatico: true,
      cortai_ativa: true,
      responder_whatsapp: true,
      saudacao_ativa: true,
      confirmacao_automatica: true,
      lembretes: true,
    });
  });

  it("não ativa antes do provedor confirmar a sessão", () => {
    expect(["desconectado", "pendente", "qr_pronto", "conectando", "erro"]
      .every((status) => !devePrepararAtendimento(status))).toBe(true);
    expect(devePrepararAtendimento("conectado")).toBe(true);
  });
});
