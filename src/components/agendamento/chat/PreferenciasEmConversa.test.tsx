import { describe, expect, it } from "vitest";

import { perguntasParaSegmento } from "./PreferenciasEmConversa";

describe("perguntasParaSegmento", () => {
  it("mantém perguntas de corte apenas no segmento barbearia", () => {
    const perguntas = perguntasParaSegmento("barbearia");
    expect(perguntas.at(-1)?.texto).toBe("Como costuma cortar?");
  });

  it("usa perguntas adequadas a salão e esmalteria", () => {
    expect(perguntasParaSegmento("salao").at(-1)?.texto).toContain("cabelo ou acabamento");
    expect(perguntasParaSegmento("esmalteria").at(-1)?.texto).toContain("unha");
    expect(perguntasParaSegmento("sobrancelha_cilios").at(-1)?.texto).toContain("sobrancelha ou cílios");
    expect(perguntasParaSegmento("estetica").at(-1)?.texto).toContain("tratamento ou objetivo");
  });

  it("segmento ausente, inválido ou outro não presume beleza nem barbearia", () => {
    for (const segmento of [undefined, null, "desconhecido", "outro"]) {
      const perguntas = perguntasParaSegmento(segmento);
      expect(perguntas).toHaveLength(1);
      expect(perguntas[0]?.texto).toBe("Há alguma preferência importante para este atendimento?");
      expect(perguntas.some((pergunta) => pergunta.campo === "conversa")).toBe(false);
    }
  });
});
