import { describe, expect, it } from "vitest";

import { FAMILIAS_DE_TEMA, familiaDoTema, familiaIds } from "@/lib/familias-tema";
import {
  aplicarTema,
  ajustarAoCatalogo,
  configPadrao,
  LAYOUTS_DO_CATALOGO,
  layoutIds,
  normalizarPagina,
  paginaStyle,
  TEMAS,
  TEMAS_ADICIONAIS_DO_CATALOGO,
  TEMAS_DO_CATALOGO,
  TEMAS_DO_FIGARO,
  TEMAS_FEMININOS,
  temaIds,
  temasDoLayout,
  trocarLayoutNoCatalogo,
} from "@/lib/pagina-config";
import { contraste } from "@/lib/cor-marca";
import { SEGMENTOS, SEGMENTOS_CONFIG } from "@/lib/segmentos";

describe("famílias de tema", () => {
  it("cobrem os 20 temas exatamente uma vez", () => {
    const temas = FAMILIAS_DE_TEMA.flatMap((f) => f.variantes.map((v) => v.tema));
    expect(temas.sort()).toEqual([...temaIds].sort());
    expect(FAMILIAS_DE_TEMA).toHaveLength(16);
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

  it("oferece 12 temas no catálogo sem remover os seis originais", () => {
    expect(TEMAS_DO_CATALOGO).toHaveLength(12);
    expect(new Set(TEMAS_DO_CATALOGO).size).toBe(12);
    expect(TEMAS_DO_CATALOGO).toEqual([
      ...TEMAS_DO_FIGARO,
      ...TEMAS_FEMININOS,
      ...TEMAS_ADICIONAIS_DO_CATALOGO,
    ]);
    for (const tema of TEMAS_DO_CATALOGO) expect(temaIds).toContain(tema);
    for (const layout of LAYOUTS_DO_CATALOGO.filter((l) => l !== "figaro-raizes"))
      expect(temasDoLayout(layout)).toEqual(TEMAS_DO_CATALOGO);
    // O Raízes tem a própria lista: o Contraste (só dele) e cinco do catálogo.
    expect(temasDoLayout("figaro-raizes")).toHaveLength(6);
    expect(temasDoLayout("figaro-raizes")[0]).toBe("contraste");
    expect(TEMAS_DO_CATALOGO).not.toContain("contraste");
  });

  it("mantém o tema ao ajustar layouts e alternar entre site e chat", () => {
    const inicial = configPadrao({ tema: "premium", layout: "cinematografico" });
    const catalogo = ajustarAoCatalogo(inicial);
    expect(catalogo.layout).toBe("figaro-site-completo");
    expect(catalogo.tema).toBe("premium");

    const chat = trocarLayoutNoCatalogo(catalogo, "cortai-chat");
    expect(chat.layout).toBe("cortai-chat");
    expect(chat.tema).toBe("premium");
    expect(chat.experiencia).toBe("conversa");

    const site = trocarLayoutNoCatalogo(chat, "figaro-site-completo");
    expect(site.layout).toBe("figaro-site-completo");
    expect(site.tema).toBe("premium");
    expect(site.experiencia).toBe("vitrine");
  });

  it("mantém contraste AA no texto dos botões de todos os temas", () => {
    for (const tema of temaIds) {
      const config = aplicarTema(configPadrao(), tema);
      const estilo = paginaStyle(config) as Record<string, unknown>;
      const foreground = String(estilo["--brand-button-foreground"]);
      expect(contraste(foreground, config.cores.botao)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("aplicar um tema altera a paleta sem apagar o conteúdo e os ajustes do layout", () => {
    const original = configPadrao({
      layout: "figaro-site-completo",
      sobre: "Texto personalizado do negócio",
      frase: "Atendimento do seu jeito",
    });
    const atualizado = aplicarTema(original, "nude");
    expect(atualizado.tema).toBe("nude");
    expect(atualizado.cores).toEqual(TEMAS.nude.cores);
    expect(atualizado.layout).toBe("figaro-site-completo");
    expect(atualizado.sobre).toBe("Texto personalizado do negócio");
    expect(atualizado.frase).toBe("Atendimento do seu jeito");
  });

  it("20 temas × 9 layouts são configurações válidas", () => {
    expect(temaIds).toHaveLength(20);
    expect(layoutIds).toHaveLength(9);
    for (const tema of temaIds)
      for (const layout of layoutIds) {
        const c = normalizarPagina({ ...configPadrao(), tema, layout });
        expect(c.tema).toBe(tema);
        expect(c.layout).toBe(layout);
      }
  });
});
