import { describe, expect, it } from "vitest";

import { perguntasParaSegmento } from "./PreferenciasEmConversa";

describe("perguntas de preferências por segmento", () => {
  it("usa somente pergunta neutra quando segmento ausente ou desconhecido", () => {
    for (const segmento of [undefined, null, "segmento-desconhecido"]) {
      const perguntas = perguntasParaSegmento(segmento);
      expect(perguntas).toHaveLength(1);
      expect(perguntas[0]?.texto).toBe("Há alguma preferência importante para este atendimento?");
      expect(perguntas[0]?.campo).toBe("corte_habitual");
      expect(perguntas.some((p) => /cortar|ar-condicionado|música|unha/i.test(p.texto))).toBe(false);
    }
  });

  it("mantém perguntas próprias quando barbearia foi escolhida", () => {
    const perguntas = perguntasParaSegmento("barbearia");
    expect(perguntas.some((p) => p.texto === "Gosta de conversar durante o atendimento?")).toBe(true);
    expect(perguntas.at(-1)?.texto).toBe("Como costuma cortar?");
  });

  it("usa preferências contextualizadas para outros segmentos de beleza", () => {
    expect(perguntasParaSegmento("salao").at(-1)?.texto).toBe(
      "Que preferência de cabelo ou acabamento gostaria de anotar?",
    );
    expect(perguntasParaSegmento("esmalteria").at(-1)?.texto).toBe(
      "Qual cor ou estilo de unha você prefere?",
    );
    expect(perguntasParaSegmento("estetica").at(-1)?.texto).toBe(
      "Qual tratamento ou objetivo gostaria de priorizar?",
    );
  });
});
