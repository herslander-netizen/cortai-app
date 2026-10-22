import { describe, expect, it } from "vitest";

import { FAMILIAS_DE_TEMA, familiaDoTema, familiaIds } from "@/lib/familias-tema";
import { configPadrao, layoutIds, normalizarPagina, temaIds } from "@/lib/pagina-config";
import { SEGMENTOS, SEGMENTOS_CONFIG } from "@/lib/segmentos";

describe("famílias de tema", () => {
  it("cobrem os 19 temas exatamente uma vez", () => {
    const temas = FAMILIAS_DE_TEMA.flatMap((f) => f.variantes.map((v) => v.tema));
    expect(temas.sort()).toEqual([...temaIds].sort());
    expect(FAMILIAS_DE_TEMA).toHaveLength(15);
  });

  it("encontra a família de cada tema", () => {
    expect(familiaDoTema("street").id).toBe("urbano");
    expect(familiaDoTema("industrial").id).toBe("noturno");
  });

  it("todo segmento tem recomendações válidas", () => {
    for (const s of SEGMENTOS) {
      const rec = SEGMENTOS_CONFIG[s].familiasRecomendadas;
      expect(rec.length).toBeGreaterThan(0);
      for (const f of rec) expect(familiaIds).toContain(f);
    }
    expect(SEGMENTOS_CONFIG.barbearia.familiasRecomendadas).toContain("noturno");
    expect(SEGMENTOS_CONFIG.salao.familiasRecomendadas).toContain("rose");
  });

  it("19 temas × 7 layouts são configurações válidas", () => {
    expect(temaIds).toHaveLength(19);
    expect(layoutIds).toHaveLength(7);
    for (const tema of temaIds)
      for (const layout of layoutIds) {
        const c = normalizarPagina({ ...configPadrao(), tema, layout });
        expect(c.tema).toBe(tema);
        expect(c.layout).toBe(layout);
      }
  });
});
