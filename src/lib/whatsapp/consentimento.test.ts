import { describe, expect, it } from "vitest";

import {
  decidirConsentimentoWhatsapp,
  ehFinalidadeWhatsapp,
  FINALIDADES_DE_SERVICO,
  FINALIDADES_WHATSAPP,
  finalidadeDaNotificacao,
  telefoneEmE164,
} from "./consentimento";

describe("governança de consentimento WhatsApp", () => {
  it("falha de forma segura quando não existe evento de concessão", () => {
    expect(decidirConsentimentoWhatsapp({ suprimido: false, ultimaAcao: null })).toEqual({
      pode: false,
      motivo: "Não existe consentimento válido para esta finalidade.",
    });
  });

  it("uma revogação posterior impede novos envios proativos", () => {
    expect(decidirConsentimentoWhatsapp({ suprimido: false, ultimaAcao: "revogado" }).pode).toBe(
      false,
    );
  });

  it("pedido de reconsentimento não equivale a autorização", () => {
    expect(
      decidirConsentimentoWhatsapp({
        suprimido: false,
        ultimaAcao: "reconsentimento_solicitado",
      }).pode,
    ).toBe(false);
  });

  it("uma supressão ativa prevalece até sobre uma concessão anterior", () => {
    expect(decidirConsentimentoWhatsapp({ suprimido: true, ultimaAcao: "concedido" }).pode).toBe(
      false,
    );
  });

  it("permite somente quando há concessão válida e nenhuma supressão ativa", () => {
    expect(decidirConsentimentoWhatsapp({ suprimido: false, ultimaAcao: "concedido" })).toEqual({
      pode: true,
    });
  });

  it("normaliza números brasileiros para E.164 e recusa números inválidos", () => {
    expect(telefoneEmE164("(79) 99123-4567")).toBe("+5579991234567");
    expect(telefoneEmE164("55 79 9123-4567")).toBe("+557991234567");
    expect(telefoneEmE164("123")).toBeNull();
    expect(telefoneEmE164(null)).toBeNull();
  });

  it("classifica notificações por finalidade, sem confundir fila e relacionamento", () => {
    expect(finalidadeDaNotificacao("vaga_lista_espera")).toBe("lista_espera");
    expect(finalidadeDaNotificacao("retorno")).toBe("relacionamento");
    expect(finalidadeDaNotificacao("lembrete_24h")).toBe("avisos_agendamento");
    expect(finalidadeDaNotificacao("cancelamento")).toBe("avisos_agendamento");
  });

  it("mantém marketing separado das finalidades de serviço", () => {
    expect(FINALIDADES_WHATSAPP).toContain("marketing");
    expect(FINALIDADES_DE_SERVICO).not.toContain("marketing");
    expect(ehFinalidadeWhatsapp("marketing")).toBe(true);
    expect(ehFinalidadeWhatsapp("atendimento_interno")).toBe(false);
  });
});
