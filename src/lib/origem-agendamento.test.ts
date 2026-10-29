import { describe, expect, it } from "vitest";
import { ORIGENS_AGENDAMENTO, descreverOrigem, origemDoCortai } from "./origem-agendamento";

describe("descreverOrigem", () => {
  it("rótulos e ícones de todas as origens", () => {
    const r = (o: string) => descreverOrigem(o, false);
    expect(r("whatsapp")).toMatchObject({ rotulo: "WhatsApp", icone: "whatsapp" });
    expect(r("link_publico")).toMatchObject({ rotulo: "Link", icone: "link" });
    expect(r("manual")).toMatchObject({ rotulo: "Manual", icone: "manual" });
    expect(r("app")).toMatchObject({ rotulo: "Manual", icone: "manual" });
    expect(r("instagram")).toMatchObject({ rotulo: "Instagram", icone: "instagram" });
  });
  it("Flow IA nunca é origem; só selo quando assistido", () => {
    expect(descreverOrigem("whatsapp", true).cortai).toBe(true);
    expect(descreverOrigem("manual", false).cortai).toBe(false);
    for (const o of ORIGENS_AGENDAMENTO)
      expect(descreverOrigem(o, true).rotulo).not.toMatch(/cortai/i);
  });
  it("valor desconhecido ou nulo cai em Manual", () => {
    expect(descreverOrigem(null, false).rotulo).toBe("Manual");
    expect(descreverOrigem("xyz", false).ariaOrigem).toBe("Origem: Manual");
  });
});

describe("origemDoCortai", () => {
  it("cliente no WhatsApp → whatsapp", () => {
    expect(origemDoCortai("whatsapp")).toBe("whatsapp");
    expect(origemDoCortai("whatsapp", "cliente")).toBe("whatsapp");
  });
  it("equipe (painel ou WhatsApp da equipe) → manual", () => {
    expect(origemDoCortai("painel")).toBe("manual");
    expect(origemDoCortai("whatsapp", "dono")).toBe("manual");
    expect(origemDoCortai("whatsapp", "profissional")).toBe("manual");
  });
});
