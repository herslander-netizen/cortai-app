import { describe, expect, it } from "vitest";

import { detectarExperiencia, detectarOrigem } from "@/lib/funil";
import { faixaDePreco, montarSchemaNegocio, tipoSchemaDoSegmento } from "@/lib/schema-negocio";

describe("origem do funil", () => {
  it("parâmetro vence o referrer", () => {
    expect(detectarOrigem("?origem=qr", "https://instagram.com/x")).toBe("qr");
    expect(detectarOrigem("?utm_source=Instagram", "")).toBe("instagram");
    expect(detectarOrigem("?origem=xyz", "")).toBe("outro");
  });
  it("referrer por domínio", () => {
    expect(detectarOrigem("", "https://l.instagram.com/")).toBe("instagram");
    expect(detectarOrigem("", "https://wa.me/55")).toBe("whatsapp");
    expect(detectarOrigem("", "https://www.google.com.br/")).toBe("google");
    expect(detectarOrigem("", "https://m.facebook.com/")).toBe("facebook");
    expect(detectarOrigem("", "https://exemplo.com/")).toBe("outro");
    expect(detectarOrigem("", "https://cortai.dev/b/x", "cortai.dev")).toBe("direto");
    expect(detectarOrigem("", "")).toBe("direto");
  });
  it("experiência e fluxo", () => {
    expect(detectarExperiencia("?de=vitrine", "conversa")).toBe("vitrine");
    expect(detectarExperiencia("", "conversa")).toBe("conversa");
    expect(detectarExperiencia("", "direta")).toBe("direta");
  });
});

describe("schema do negócio", () => {
  it("mapeia segmento", () => {
    expect(tipoSchemaDoSegmento("barbearia")).toBe("HairSalon");
    expect(tipoSchemaDoSegmento("sobrancelha_cilios")).toBe("BeautySalon");
    expect(tipoSchemaDoSegmento("esmalteria")).toBe("NailSalon");
    expect(tipoSchemaDoSegmento("estetica")).toBe("DaySpa");
    expect(tipoSchemaDoSegmento("outro")).toBe("LocalBusiness");
    expect(tipoSchemaDoSegmento(null)).toBe("LocalBusiness");
    expect(tipoSchemaDoSegmento("segmento_desconhecido")).toBe("LocalBusiness");
  });
  it("faixa de preço", () => {
    expect(faixaDePreco([3500, 15000, 0])).toBe("R$ 35–150");
    expect(faixaDePreco([])).toBeNull();
  });
  it("monta e omite vazios, sem aggregateRating", () => {
    const s = montarSchemaNegocio({
      slug: "demo",
      nome: "Demo",
      descricao: null,
      segmento: "salao",
      endereco: "Rua A, 1",
      telefone: null,
      whatsapp: "11999998888",
      instagram: "@demo",
      imagem: null,
      logo: null,
      horarios: [
        { dia_semana: 0, fechado: true, abre: "09:00:00", fecha: "18:00:00" },
        { dia_semana: 1, fechado: false, abre: "09:00:00", fecha: "18:00:00" },
      ],
      precos: [5000],
    });
    expect(s["@type"]).toBe("BeautySalon");
    expect(s["telephone"]).toBe("+5511999998888");
    expect(s["description"]).toBeUndefined();
    expect(s["aggregateRating"]).toBeUndefined();
    expect((s["openingHoursSpecification"] as unknown[]).length).toBe(1);
    expect(s["sameAs"]).toEqual(["https://instagram.com/demo"]);
  });
});
