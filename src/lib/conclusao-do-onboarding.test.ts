import { describe, expect, it } from "vitest";

import { duracaoDaDigitacao, fonteDoLink, trechoDigitado } from "./conclusao-do-onboarding";

describe("conclusão do onboarding (Figaro)", () => {
  it("digita o link letra a letra, sem passar do fim", () => {
    expect(trechoDigitado("cortai.dev/loja", 0)).toBe("");
    expect(trechoDigitado("cortai.dev/loja", 6)).toBe("cortai");
    expect(trechoDigitado("cortai.dev/loja", 99)).toBe("cortai.dev/loja");
    expect(trechoDigitado("cortai.dev/loja", -3)).toBe("");
  });

  it("leva 32 ms por letra", () => {
    expect(duracaoDaDigitacao("abcd")).toBe(128);
  });

  it("a fonte vai de 18 a 14 px conforme o link cresce", () => {
    expect(fonteDoLink("cortai.dev/a", 342)).toBe(18);
    expect(fonteDoLink("cortai.dev/barbearia-prime-da-vila", 342)).toBeLessThan(18);
    expect(fonteDoLink("x".repeat(200), 342)).toBe(14);
  });
});
