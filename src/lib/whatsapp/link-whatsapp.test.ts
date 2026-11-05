import { describe, expect, it } from "vitest";

import { linkDoWhatsApp, numeroParaEnvio } from "./link-whatsapp";

describe("linkDoWhatsApp", () => {
  it("telefone sem DDI ganha o 55 (nunca vira +7, Rússia)", () => {
    expect(linkDoWhatsApp("79991787208")).toBe("https://wa.me/5579991787208");
    expect(linkDoWhatsApp("(79) 99178-7208", "Olá!")).toBe(
      "https://wa.me/5579991787208?text=Ol%C3%A1!",
    );
  });

  it("com DDI fica como está", () => {
    expect(linkDoWhatsApp("+55 79 99178-7208")).toBe("https://wa.me/5579991787208");
  });

  it("número inutilizável não vira link", () => {
    expect(linkDoWhatsApp("1198")).toBeNull();
    expect(linkDoWhatsApp(null)).toBeNull();
  });
});

describe("numeroParaEnvio", () => {
  it("acrescenta o 55 ao número sem DDI", () => {
    expect(numeroParaEnvio("79991787208")).toBe("5579991787208");
    expect(numeroParaEnvio("557998181983")).toBe("557998181983");
  });
});
