import { describe, expect, it } from "vitest";

import { pedacosCodificados } from "./telemetria";

describe("telemetria da prévia", () => {
  it("divide sem cortar escapes e junta de volta ao texto original", () => {
    const texto = JSON.stringify([
      { k: "erro", msg: "Não foi possível — ação ç ã é 💥".repeat(30) },
    ]);
    const codificado = encodeURIComponent(texto);
    const pedacos = pedacosCodificados(codificado, 50);
    expect(pedacos.length).toBeGreaterThan(5);
    for (const p of pedacos) {
      expect(p.length).toBeLessThanOrEqual(50);
      // nenhum pedaço termina no meio de um %XX
      expect(/%[0-9A-F]?$/i.test(p)).toBe(false);
    }
    expect(decodeURIComponent(pedacos.join(""))).toBe(texto);
  });

  it("texto vazio vira um pedaço vazio", () => {
    expect(pedacosCodificados("")).toEqual([""]);
  });
});
