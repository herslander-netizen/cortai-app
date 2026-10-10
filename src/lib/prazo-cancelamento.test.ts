import { describe, expect, it } from "vitest";

import { mensagemDoPrazoDeCancelamento, prazoDeCancelamentoVencido } from "./prazo-cancelamento";

const horario = "2026-10-10T15:00:00Z";
const as = (iso: string) => new Date(iso);

describe("prazo de cancelamento", () => {
  it("dentro do prazo (faltam mais horas que o mínimo) pode cancelar", () => {
    expect(prazoDeCancelamentoVencido(horario, 2, as("2026-10-10T12:00:00Z"))).toBe(false);
  });
  it("faltando menos que o mínimo, o prazo venceu", () => {
    expect(prazoDeCancelamentoVencido(horario, 2, as("2026-10-10T13:30:00Z"))).toBe(true);
  });
  it("no limite exato ainda pode cancelar", () => {
    expect(prazoDeCancelamentoVencido(horario, 2, as("2026-10-10T13:00:00Z"))).toBe(false);
  });
  it("mínimo 0 ou vazio: sem restrição", () => {
    expect(prazoDeCancelamentoVencido(horario, 0, as("2026-10-10T14:59:00Z"))).toBe(false);
    expect(prazoDeCancelamentoVencido(horario, null, as("2026-10-10T14:59:00Z"))).toBe(false);
  });
  it("mensagem concorda no singular e no plural", () => {
    expect(mensagemDoPrazoDeCancelamento(1)).toContain("1 hora antes");
    expect(mensagemDoPrazoDeCancelamento(24)).toContain("24 horas antes");
  });
});
