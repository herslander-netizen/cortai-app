import { describe, expect, it } from "vitest";

import { valoresEmReais } from "./notificacoes";

describe("valoresEmReais", () => {
  it("troca o ponto decimal do banco pela vírgula", () => {
    expect(valoresEmReais("R$ 220.00 — Coloração e tonalização")).toBe(
      "R$ 220,00 — Coloração e tonalização",
    );
  });
  it("separa milhares", () => {
    expect(valoresEmReais("R$ 1500.50 — Pacote")).toBe("R$ 1.500,50 — Pacote");
  });
  it("não mexe em texto sem valor nem em datas", () => {
    expect(valoresEmReais("Isabela Oliveira — 26/10 16:30")).toBe("Isabela Oliveira — 26/10 16:30");
  });
});
