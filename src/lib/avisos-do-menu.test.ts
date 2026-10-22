import { describe, expect, it } from "vitest";

import { avisosDoMenu, renovacaoDaCota, textosDoWhatsapp } from "./avisos-do-menu";

const base = {
  emailPendente: false,
  avisosDoAparelhoVisivel: false,
  faixaDoWhatsapp: "aviso" as const,
  whatsappDispensado: false,
};

describe("avisos de configuração do menu (regra do Figaro)", () => {
  it("o e-mail aparece enquanto estiver pendente", () => {
    expect(avisosDoMenu({ ...base, emailPendente: true }).email).toBe(true);
    expect(avisosDoMenu({ ...base, emailPendente: false }).email).toBe(false);
  });

  it("o alerta de WhatsApp aparece nas faixas aviso e pausado, não na livre", () => {
    expect(avisosDoMenu(base).whatsapp).toBe(true);
    expect(avisosDoMenu({ ...base, faixaDoWhatsapp: "pausado" }).whatsapp).toBe(true);
    expect(avisosDoMenu({ ...base, faixaDoWhatsapp: "livre" }).whatsapp).toBe(false);
  });

  it("some quando e-mail e notificações do aparelho já estão juntos na tela", () => {
    const juntos = { ...base, emailPendente: true, avisosDoAparelhoVisivel: true };
    expect(avisosDoMenu(juntos).whatsapp).toBe(false);
    expect(avisosDoMenu({ ...juntos, emailPendente: false }).whatsapp).toBe(true);
    expect(avisosDoMenu({ ...juntos, avisosDoAparelhoVisivel: false }).whatsapp).toBe(true);
  });

  it("some depois de dispensado", () => {
    expect(avisosDoMenu({ ...base, whatsappDispensado: true }).whatsapp).toBe(false);
  });
});

describe("textos do alerta de WhatsApp", () => {
  it("renovação é o primeiro dia do mês seguinte, em dd/MM", () => {
    expect(renovacaoDaCota(new Date("2026-10-23T12:00:00Z"))).toBe("01/11");
    expect(renovacaoDaCota(new Date("2026-12-31T12:00:00Z"))).toBe("01/01");
  });

  it("acabando: mostra quantas restam e quando renova", () => {
    expect(textosDoWhatsapp("aviso", 500, 600, "01/11")).toEqual({
      titulo: "Mensagens do WhatsApp acabando",
      corpo: "100 de 600 restantes neste mês · renova em 01/11",
    });
  });

  it("pausadas: diz quando voltam e que o app segue funcionando", () => {
    expect(textosDoWhatsapp("pausado", 600, 600, "01/11")).toEqual({
      titulo: "Mensagens do WhatsApp pausadas",
      corpo: "Voltam em 01/11 · o app segue funcionando",
    });
  });
});
