import { describe, expect, it } from "vitest";
import { calcularContaVerificada, mascararTelefone } from "./seguranca-conta";

describe("calcularContaVerificada", () => {
  it("dono sem WhatsApp verificado não é verificado", () => {
    expect(
      calcularContaVerificada({ papel: "dono", emailVerificado: true, whatsappVerificado: false }),
    ).toBe(false);
  });
  it("dono com e-mail e WhatsApp é verificado", () => {
    expect(
      calcularContaVerificada({ papel: "dono", emailVerificado: true, whatsappVerificado: true }),
    ).toBe(true);
  });
  it("profissional com e-mail e WhatsApp é verificado", () => {
    expect(
      calcularContaVerificada({
        papel: "profissional",
        emailVerificado: true,
        whatsappVerificado: true,
      }),
    ).toBe(true);
  });
  it("cliente não depende de WhatsApp", () => {
    expect(
      calcularContaVerificada({
        papel: "cliente",
        emailVerificado: true,
        whatsappVerificado: false,
      }),
    ).toBe(true);
  });
  it("e-mail pendente nunca verifica", () => {
    expect(
      calcularContaVerificada({ papel: "dono", emailVerificado: false, whatsappVerificado: true }),
    ).toBe(false);
  });
  it("mascara o telefone", () => {
    expect(mascararTelefone("5511999998888")).toBe("•••• 8888");
    expect(mascararTelefone(null)).toBeNull();
  });
});
