import { describe, expect, it } from "vitest";

import { decidirEncaixe } from "./folha-dois-estados";

const base = { parcial: 500, cheio: 900 };

describe("encaixe da folha em dois estados", () => {
  it("puxada rápida para cima abre cheia, venha de onde vier", () => {
    expect(decidirEncaixe({ ...base, altura: 520, inicio: 500, velocidade: -0.9 })).toBe("cheio");
  });
  it("puxada rápida para baixo recolhe uma etapa por vez", () => {
    expect(decidirEncaixe({ ...base, altura: 800, inicio: 900, velocidade: 0.9 })).toBe("parcial");
    expect(decidirEncaixe({ ...base, altura: 480, inicio: 500, velocidade: 0.9 })).toBe("fechar");
  });
  it("sem puxada rápida vale o estado mais próximo", () => {
    expect(decidirEncaixe({ ...base, altura: 760, inicio: 500, velocidade: 0 })).toBe("cheio");
    expect(decidirEncaixe({ ...base, altura: 600, inicio: 900, velocidade: 0 })).toBe("parcial");
    expect(decidirEncaixe({ ...base, altura: 300, inicio: 500, velocidade: 0 })).toBe("fechar");
    expect(decidirEncaixe({ ...base, altura: 400, inicio: 500, velocidade: 0 })).toBe("parcial");
  });
});
