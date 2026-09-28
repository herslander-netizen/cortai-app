import { describe, expect, it } from "vitest";

import { LISTA_DE_SEGMENTOS, segmentoValido, termos } from "@/lib/segmentos";

describe("segmentos", () => {
  it("mantém barbearia como fallback", () => {
    expect(segmentoValido("inexistente")).toBe("barbearia");
    expect(termos(null).nome).toBe("barbearia");
  });

  it("possui termos completos em todos os segmentos", () => {
    for (const segmento of LISTA_DE_SEGMENTOS) {
      for (const valor of Object.values(segmento.termos)) expect(valor.trim().length).toBeGreaterThan(0);
    }
  });

  it("possui sugestões e horários válidos", () => {
    for (const segmento of LISTA_DE_SEGMENTOS) {
      for (const servico of segmento.servicosSugeridos) {
        expect(servico.duracaoMin).toBeGreaterThanOrEqual(5);
        expect(servico.duracaoMin).toBeLessThanOrEqual(480);
      }
      expect(segmento.horariosPadrao).toHaveLength(7);
      for (const horario of segmento.horariosPadrao) {
        expect(horario.diaSemana).toBeGreaterThanOrEqual(0);
        expect(horario.diaSemana).toBeLessThanOrEqual(6);
        expect(horario.abre).toMatch(/^\d{2}:\d{2}$/);
        expect(horario.fecha).toMatch(/^\d{2}:\d{2}$/);
      }
    }
  });
});