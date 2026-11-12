import { describe, expect, it, vi } from "vitest";

import { tituloDoDia } from "./lista-periodo-regras";

describe("montagem dos títulos da Lista", () => {
  it("mantém as datas em português e o formato Figaro", () => {
    expect(tituloDoDia("2026-11-11")).toEqual({
      curto: "11 de novembro",
      abreviado: "11 nov.",
      semana: "Quarta-feira",
    });
    expect(tituloDoDia("2027-01-01")).toEqual({
      curto: "1 de janeiro",
      abreviado: "1 jan.",
      semana: "Sexta-feira",
    });
  });

  it("não reconstrói Intl.DateTimeFormat ao montar 60 dias", () => {
    const construtor = vi.spyOn(Intl, "DateTimeFormat");
    try {
      for (let dia = 1; dia <= 60; dia += 1) {
        const data = new Date(Date.UTC(2026, 10, dia)).toISOString().slice(0, 10);
        tituloDoDia(data);
      }
      expect(construtor).not.toHaveBeenCalled();
    } finally {
      construtor.mockRestore();
    }
  });
});
