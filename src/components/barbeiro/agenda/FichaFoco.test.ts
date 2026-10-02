import { describe, expect, it } from "vitest";
import { fichaFocoVisivel } from "./ficha-foco";

describe("fichaFocoVisivel", () => {
  it("expõe somente os campos existentes", () => {
    expect(fichaFocoVisivel({ bebida: "cafe", musica: "Rock" }, null)).toEqual({
      atencao: null,
      conversa: null,
      ar: null,
      bebida: "cafe",
      musica: "Rock",
      corte: null,
      assuntos: null,
      observacao: null,
    });
  });
});
