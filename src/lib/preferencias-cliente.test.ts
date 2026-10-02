import { describe, expect, it } from "vitest";
import { validarPreferenciasCliente } from "./preferencias-cliente";

describe("validarPreferenciasCliente", () => {
  it("aceita os campos previstos", () => expect(validarPreferenciasCliente({ conversa: "papo", musica: "Rock" })).toEqual({ conversa: "papo", musica: "Rock" }));
  it("rejeita enum inválido", () => expect(() => validarPreferenciasCliente({ conversa: "qualquer" })).toThrow("inválida"));
  it("rejeita limite e HTML", () => {
    expect(() => validarPreferenciasCliente({ musica: "x".repeat(41) })).toThrow("40");
    expect(() => validarPreferenciasCliente({ assuntos: "<b>segredo</b>" })).toThrow("HTML");
  });
});