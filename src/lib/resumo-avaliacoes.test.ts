import { describe, expect, it } from "vitest";

import {
  distribuicaoDasNotas,
  estrelasDaMedia,
  mediaFormatada,
  rotuloDaMedia,
  tomDaNota,
} from "./resumo-avaliacoes";

describe("resumo das avaliações (faixas do Figaro)", () => {
  it("dá o rótulo pelas mesmas faixas do APK", () => {
    expect(rotuloDaMedia(null)).toBe("—");
    expect(rotuloDaMedia(0.04)).toBe("—");
    expect(rotuloDaMedia(1.9)).toBe("Insatisfatório");
    expect(rotuloDaMedia(2)).toBe("Regular");
    expect(rotuloDaMedia(3.99)).toBe("Satisfatório");
    expect(rotuloDaMedia(4)).toBe("Muito bom");
    expect(rotuloDaMedia(4.5)).toBe("Excelente");
  });

  it("monta as estrelas com meia estrela até 0,5 abaixo", () => {
    expect(estrelasDaMedia(4.6)).toEqual(["cheia", "cheia", "cheia", "cheia", "meia"]);
    expect(estrelasDaMedia(4.4)).toEqual(["cheia", "cheia", "cheia", "cheia", "vazia"]);
    expect(estrelasDaMedia(0)).toEqual(["vazia", "vazia", "vazia", "vazia", "vazia"]);
  });

  it("conta as notas de 5 a 1 com percentual inteiro", () => {
    expect(distribuicaoDasNotas([5, 5, 4])).toEqual([
      { nota: 5, total: 2, percentual: 66 },
      { nota: 4, total: 1, percentual: 33 },
      { nota: 3, total: 0, percentual: 0 },
      { nota: 2, total: 0, percentual: 0 },
      { nota: 1, total: 0, percentual: 0 },
    ]);
    expect(distribuicaoDasNotas([]).every((l) => l.percentual === 0)).toBe(true);
  });

  it("usa só tokens de cor e formata com vírgula", () => {
    expect([5, 4, 3, 2, 1].map(tomDaNota)).toEqual([
      "bg-sage",
      "bg-[var(--status-arrived)]",
      "bg-[var(--status-active)]",
      "bg-brick",
      "bg-brick",
    ]);
    expect(mediaFormatada(4.6)).toBe("4,6");
    expect(mediaFormatada(5)).toBe("5,0");
  });
});
