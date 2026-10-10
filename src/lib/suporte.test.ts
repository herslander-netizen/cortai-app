import { describe, expect, it } from "vitest";

import { linkDoSuporte } from "./suporte";

describe("linkDoSuporte", () => {
  it("sem número configurado, não há link (o cartão fica escondido)", () => {
    expect(linkDoSuporte("")).toBeNull();
    expect(linkDoSuporte("123")).toBeNull();
  });
  it("monta o link do WhatsApp com o 55 quando falta", () => {
    expect(linkDoSuporte("(11) 98765-4321")).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
    expect(linkDoSuporte("+55 11 98765-4321")).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
  });
});
