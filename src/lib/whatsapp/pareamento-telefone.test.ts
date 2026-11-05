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
  it("celular de DDD 31 em diante sai sem o 9 extra, como o WhatsApp registra", () => {
    expect(numeroParaPareamento("79991787208")).toBe("557991787208");
    expect(numeroParaPareamento("+55 (79) 99178-7208")).toBe("557991787208");
    expect(numeroParaPareamento("31 98888-7777")).toBe("553188887777");
    // DDD 11 a 28 mantêm o 9; fixo não muda.
    expect(numeroParaPareamento("21 98888-7777")).toBe("5521988887777");
    expect(numeroParaPareamento("79 3214-5678")).toBe("557932145678");
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
