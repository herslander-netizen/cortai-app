import { describe, expect, it } from "vitest";

import { codigoDePareamento, formatarCodigo, numeroParaPareamento } from "./pareamento-telefone";

describe("numeroParaPareamento", () => {
  it("assume Brasil quando vem sem DDI", () => {
    expect(numeroParaPareamento("(11) 99999-8888")).toBe("5511999998888");
    expect(numeroParaPareamento("11 3333-4444")).toBe("551133334444");
  });
  it("mantém o número que já traz DDI", () => {
    expect(numeroParaPareamento("+55 11 99999-8888")).toBe("5511999998888");
    expect(numeroParaPareamento("+351 912 345 678")).toBe("351912345678");
  });
  it("recusa números curtos, longos ou vazios", () => {
    expect(numeroParaPareamento("")).toBeNull();
    expect(numeroParaPareamento("99999")).toBeNull();
    expect(numeroParaPareamento("1234567890123456")).toBeNull();
  });
  it("ignora o zero de tronco", () => {
    expect(numeroParaPareamento("011 99999-8888")).toBe("5511999998888");
  });
});

describe("codigoDePareamento", () => {
  it("lê o pairingCode da Evolution", () => {
    expect(codigoDePareamento({ pairingCode: "wzyeh1yy", code: "2@abc", count: 1 })).toBe(
      "WZYEH1YY",
    );
  });
  it("devolve null sem código válido", () => {
    expect(codigoDePareamento({ code: "2@abc" })).toBeNull();
    expect(codigoDePareamento({ pairingCode: "ABC" })).toBeNull();
    expect(codigoDePareamento(null)).toBeNull();
  });
});

describe("formatarCodigo", () => {
  it("separa em dois blocos de 4", () => {
    expect(formatarCodigo("WZYEH1YY")).toBe("WZYE-H1YY");
  });
});
