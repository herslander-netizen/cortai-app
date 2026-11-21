import { describe, expect, it } from "vitest";

import coverBarbearia from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import { capaPublicaRecomendada } from "@/lib/flow-visual-presets";

describe("capa pública recomendada", () => {
  it("preserva a capa configurada pelo estabelecimento", () => {
    const personalizada = "https://example.com/capa.webp";
    expect(capaPublicaRecomendada("barbearia", personalizada)).toBe(personalizada);
    expect(capaPublicaRecomendada("salao", personalizada)).toBe(personalizada);
  });

  it("usa a foto existente de barbearia se o estabelecimento não enviou capa", () => {
    expect(capaPublicaRecomendada("barbearia", null)).toBe(coverBarbearia.url);
    expect(capaPublicaRecomendada("barbearia", "")).toBe(coverBarbearia.url);
  });

  it("preserva a recomendação dos outros segmentos e o fallback neutro de quem não tem foto", () => {
    expect(capaPublicaRecomendada("salao", null)).toBe("/temas/feminino-rose.webp");
    expect(capaPublicaRecomendada("outro", null)).toBeNull();
  });
});
