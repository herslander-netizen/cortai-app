import { describe, expect, it } from "vitest";
import { calcularDescontoCheckout, calcularDinheiroCheckout } from "./checkout-figaroo";

describe("Checkout Figaroo — valores da comanda", () => {
  it("mantém preço sem desconto quando campo está vazio", () => {
    expect(calcularDescontoCheckout(9000, "", "reais"))
      .toEqual({ descontoCentavos: 0, totalCentavos: 9000, valido: true });
  });

  it("calcula desconto fixo em reais com centavos", () => {
    expect(calcularDescontoCheckout(9900, "12,50", "reais"))
      .toEqual({ descontoCentavos: 1250, totalCentavos: 8650, valido: true });
  });

  it("converte porcentagem decimal sem gerar cobrança negativa", () => {
    expect(calcularDescontoCheckout(9999, "12,5", "percentual"))
      .toEqual({ descontoCentavos: 1250, totalCentavos: 8749, valido: true });
    expect(calcularDescontoCheckout(2500, "100", "percentual"))
      .toEqual({ descontoCentavos: 2500, totalCentavos: 0, valido: true });
    expect(calcularDescontoCheckout(2500, "9999", "reais"))
      .toEqual({ descontoCentavos: 2500, totalCentavos: 0, valido: true });
  });

  it("rejeita porcentagem maior que 100 e valores monetários inválidos", () => {
    for (const invalido of ["101", "-10", "10.123", "Infinity", "1e4", "abc"]) {
      expect(calcularDescontoCheckout(10000, invalido, "percentual").valido).toBe(false);
    }
    for (const invalido of ["-1", "NaN", "2.999", "0,001", "1e9", "1.234,56"]) {
      expect(calcularDescontoCheckout(10000, invalido, "reais").valido).toBe(false);
    }
  });

  it("exige que o valor em dinheiro seja informado antes de confirmar", () => {
    expect(calcularDinheiroCheckout(8500, ""))
      .toEqual({ recebidoCentavos: null, faltaCentavos: 8500, trocoCentavos: 0, podeConfirmar: false });
  });

  it("mostra quanto falta receber e impede baixar com pagamento parcial", () => {
    expect(calcularDinheiroCheckout(8500, "50,00"))
      .toEqual({ recebidoCentavos: 5000, faltaCentavos: 3500, trocoCentavos: 0, podeConfirmar: false });
  });

  it("mostra troco e permite o recebimento integral", () => {
    expect(calcularDinheiroCheckout(8500, "100"))
      .toEqual({ recebidoCentavos: 10000, faltaCentavos: 0, trocoCentavos: 1500, podeConfirmar: true });
    expect(calcularDinheiroCheckout(8500, "85,00").podeConfirmar).toBe(true);
  });

  it("não aceita entrada de dinheiro inválida como pagamento", () => {
    for (const entrada of ["dez", "-100", "0,001", "1e5", "10.00.00"]) {
      expect(calcularDinheiroCheckout(8500, entrada).podeConfirmar).toBe(false);
    }
  });

  it("zero só pode ser confirmado quando informado explicitamente", () => {
    expect(calcularDinheiroCheckout(0, "").podeConfirmar).toBe(false);
    expect(calcularDinheiroCheckout(0, "0").podeConfirmar).toBe(true);
  });
});
