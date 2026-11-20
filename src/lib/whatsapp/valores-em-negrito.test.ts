import { describe, expect, it } from "vitest";
import { destacarValoresEmReaisNoWhatsapp } from "./valores-em-negrito";

describe("valores em negrito no WhatsApp", () => {
  it("destaca os preços do catálogo sem mudar texto, ordem ou números", () => {
    const original = [
      "📋 Qual serviço você quer?",
      "",
      "1) Limpeza de pele — R$ 120,00",
      "2) Design de sobrancelha — R$ 45,00",
      "3) Massagem relaxante — R$ 150,00",
      "4) Manicure — R$ 40,00",
    ].join("\n");

    expect(destacarValoresEmReaisNoWhatsapp(original)).toBe(
      original
        .replace("R$ 120,00", "*R$ 120,00*")
        .replace("R$ 45,00", "*R$ 45,00*")
        .replace("R$ 150,00", "*R$ 150,00*")
        .replace("R$ 40,00", "*R$ 40,00*"),
    );
  });

  it("respeita trechos ja destacados e pode ser aplicado de novo", () => {
    const original = "*Valor total: R$ 120,00* e entrada R$ 30,00";
    const esperado = "*Valor total: R$ 120,00* e entrada *R$ 30,00*";
    expect(destacarValoresEmReaisNoWhatsapp(original)).toBe(esperado);
    expect(destacarValoresEmReaisNoWhatsapp(esperado)).toBe(esperado);
  });

  it("suporta milhares, espaços e valores sem centavos", () => {
    expect(destacarValoresEmReaisNoWhatsapp("Total R$ 1.250,00, entrada R$30"))
      .toBe("Total *R$ 1.250,00*, entrada *R$30*");
  });

  it("nao altera duracao, numeracao, valores sem moeda ou centavos invalidos", () => {
    const original = "1) Sessão — 50 min; valor 120; código R$ 15,000";
    expect(destacarValoresEmReaisNoWhatsapp(original)).toBe(original);
  });

  it("nao modifica mensagem sem precos nem negritos existentes", () => {
    const texto = "*Agendamento confirmado!*\nQuinta às 14:30.";
    expect(destacarValoresEmReaisNoWhatsapp(texto)).toBe(texto);
  });
});
