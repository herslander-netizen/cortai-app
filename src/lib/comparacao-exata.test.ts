import { describe, expect, it } from "vitest";
import { codigoDeCupomValido, mesmoEmail } from "./comparacao-exata";

describe("mesmoEmail", () => {
  it("aceita o mesmo e-mail sem diferenciar maiúsculas", () => {
    expect(mesmoEmail("Dono.Cortai@Dominio.com", "dono.cortai@dominio.com")).toBe(true);
    expect(mesmoEmail(" dono@dominio.com ", "dono@dominio.com")).toBe(true);
  });
  it("não trata _ e % como curinga", () => {
    expect(mesmoEmail("dono_cortai@dominio.com", "dono.cortai@dominio.com")).toBe(false);
    expect(mesmoEmail("%@dominio.com", "dono@dominio.com")).toBe(false);
    expect(mesmoEmail("%", "dono@dominio.com")).toBe(false);
  });
  it("vazio nunca casa", () => {
    expect(mesmoEmail("", "")).toBe(false);
    expect(mesmoEmail(null, undefined)).toBe(false);
  });
});

describe("codigoDeCupomValido", () => {
  it("aceita letras, números e hífen", () => {
    expect(codigoDeCupomValido("BEMVINDO10")).toBe(true);
    expect(codigoDeCupomValido("pro-2026")).toBe(true);
  });
  it("recusa curingas e outros símbolos", () => {
    for (const c of ["%", "A%", "A_B", "A*", "*", "A\\B", "a b"]) {
      expect(codigoDeCupomValido(c)).toBe(false);
    }
  });
});
