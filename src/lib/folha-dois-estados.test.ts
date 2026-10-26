import { describe, expect, it } from "vitest";

import { decidirEncaixe } from "./folha-dois-estados";

const base = { parcial: 500, cheio: 900 };

describe("encaixe da folha em dois estados (dono, 26/10)", () => {
  it("puxada rápida para cima abre cheia, venha de onde vier", () => {
    expect(decidirEncaixe({ ...base, altura: 520, inicio: 500, velocidade: -0.9 })).toBe("cheio");
  });
  it("puxada rápida para baixo fecha de uma vez, mesmo vindo da cheia", () => {
    expect(decidirEncaixe({ ...base, altura: 800, inicio: 900, velocidade: 0.9 })).toBe("fechar");
    expect(decidirEncaixe({ ...base, altura: 480, inicio: 500, velocidade: 0.9 })).toBe("fechar");
  });
  it("puxou para cima: abre com tudo visível", () => {
    expect(decidirEncaixe({ ...base, altura: 560, inicio: 500, velocidade: 0 })).toBe("cheio");
  });
  it("arrastou para baixo: recolhe toda, sem parar no parcial", () => {
    expect(decidirEncaixe({ ...base, altura: 850, inicio: 900, velocidade: 0 })).toBe("fechar");
    expect(decidirEncaixe({ ...base, altura: 450, inicio: 500, velocidade: 0 })).toBe("fechar");
  });
  it("movimento pequeno volta para onde estava", () => {
    expect(decidirEncaixe({ ...base, altura: 520, inicio: 500, velocidade: 0 })).toBe("parcial");
    expect(decidirEncaixe({ ...base, altura: 880, inicio: 900, velocidade: 0 })).toBe("cheio");
  });
});
