import { describe, expect, it } from "vitest";

import { hashtags, textoPadrao } from "@/lib/divulgacao";

describe("divulgação multi-serviços", () => {
  it("usa hashtags neutras quando não há segmento", () => {
    expect(hashtags("reels", null)).toContain("#servicos");
    expect(hashtags("stories", "outro")).toContain("#servicos");
    expect(hashtags("reels", null)).not.toContain("#beleza");
  });

  it("gera hashtags específicas para segmentos conhecidos", () => {
    expect(hashtags("reels", "barbearia")).toContain("#barbearia");
    expect(hashtags("reels", "esmalteria")).toContain("#unhas");
    expect(hashtags("reels", "estetica")).toContain("#estetica");
  });

  it("usa preposição neutra em legendas para qualquer nome de negócio", () => {
    expect(textoPadrao("servico", "Espaço Horizonte", "Atendimento inicial")).toBe(
      "Atendimento inicial aqui em Espaço Horizonte.",
    );
  });
});
