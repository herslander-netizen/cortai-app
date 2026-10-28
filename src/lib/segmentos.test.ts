import { describe, expect, it } from "vitest";

import {
  LISTA_DE_SEGMENTOS,
  definicaoDoSegmento,
  segmentoParaApresentacao,
  segmentoValido,
  termos,
} from "@/lib/segmentos";

describe("segmentos", () => {
  it("usa segmento neutro quando o valor está ausente ou é inválido", () => {
    expect(segmentoValido(null)).toBe("outro");
    expect(segmentoValido(undefined)).toBe("outro");
    expect(segmentoValido("inexistente")).toBe("outro");
    expect(termos(null).nome).toBe("espaço");
    expect(termos("inexistente").nome).toBe("espaço");
    expect(definicaoDoSegmento(null).id).toBe("outro");
    expect(definicaoDoSegmento("inexistente").id).toBe("outro");
  });

  it("preserva segmentos explicitamente escolhidos", () => {
    expect(segmentoValido("barbearia")).toBe("barbearia");
    expect(segmentoValido("salao")).toBe("salao");
    expect(segmentoValido("outro")).toBe("outro");
  });

  it("usa apresentação neutra quando o segmento ainda não foi definido", () => {
    expect(segmentoParaApresentacao(null)).toBe("outro");
    expect(segmentoParaApresentacao("inexistente")).toBe("outro");
    expect(segmentoParaApresentacao("salao")).toBe("salao");
    expect(segmentoParaApresentacao("barbearia")).toBe("barbearia");
    expect(segmentoParaApresentacao("outro")).toBe("outro");
  });

  it("possui termos completos em todos os segmentos", () => {
    for (const segmento of LISTA_DE_SEGMENTOS) {
      for (const valor of Object.values(segmento.termos))
        expect(valor.trim().length).toBeGreaterThan(0);
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
