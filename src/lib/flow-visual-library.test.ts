import { describe, expect, it } from "vitest";
import { SEGMENTOS } from "@/lib/segmentos";
import { CATALOGO_VISUAL_FLOW, buscarVisualFlow, visualRecomendado } from "./flow-visual-library";
import { capaPublicaRecomendada, permitirPresetNovo, presetDoSegmento, preverPresetVisual, segmentosCobertosPorPreset, paginaInicialDoSegmento, normalizarPaginaComPreset } from "./flow-visual-presets";
import { configPadrao, TEMAS } from "./pagina-config";

describe("Flow Visual Library — integridade e prioridades", () => {
  it("aproveita apenas ativos internos e impede duplicação", () => {
    expect(new Set(CATALOGO_VISUAL_FLOW.map(i => i.id)).size).toBe(CATALOGO_VISUAL_FLOW.length);
    expect(CATALOGO_VISUAL_FLOW).toHaveLength(16);
    for(const item of CATALOGO_VISUAL_FLOW) {
      expect(item.src).toMatch(/^\/(temas|exemplos)\/[\w-]+\.webp$/);
      expect(item.segmentos.every(s => SEGMENTOS.includes(s))).toBe(true);
      expect(item.origem).toContain("IA");
      expect(item.licenca).toBeTruthy();
    }
  });
  it("filtra segmento, tipo e termo com acentos", () => {
    expect(buscarVisualFlow({segmento:"esmalteria",tipo:"servico"}).every(i=>i.segmentos.includes("esmalteria"))).toBe(true);
    expect(buscarVisualFlow({texto:"salão"}).length).toBeGreaterThan(0);
    expect(buscarVisualFlow({texto:"nao-existe-xyz"})).toHaveLength(0);
    expect(visualRecomendado("outro","hero")).toBeNull();
  });
  it("dá um preset a cada um dos 7 segmentos oficiais, com tema existente", () => {
    expect(segmentosCobertosPorPreset()).toEqual([...SEGMENTOS]);
    for(const segmento of SEGMENTOS) expect(TEMAS[presetDoSegmento(segmento).tema]).toBeDefined();
  });
  it("cria presets automáticos só na ausência de página salva", () => {
    const padrao = paginaInicialDoSegmento("esmalteria");
    expect(padrao.tema).toBe(presetDoSegmento("esmalteria").tema);
    expect(padrao.cores).toEqual(TEMAS[padrao.tema].cores);
    expect(padrao.frase).toBe(presetDoSegmento("esmalteria").fraseExemplo);
    expect(padrao.layout).toBe("cinematografico");

    const existente = configPadrao({ tema: "dark", frase: "Texto escolhido", layout: "cortai-chat" });
    expect(normalizarPaginaComPreset(existente, "salao")).toEqual(existente);
    expect(normalizarPaginaComPreset({}, "salao").tema).toBe("cortai");
    expect(normalizarPaginaComPreset(null, "salao", { frase: "Meu slogan" }).frase).toBe("Meu slogan");
    expect(normalizarPaginaComPreset(undefined, "outro").tema).toBe("cortai-creme");
  });

  it("respeita a ordem de prioridade e não modifica fotos próprias", () => {
    expect(capaPublicaRecomendada("salao","https://example.test/minha-capa.webp")).toBe("https://example.test/minha-capa.webp");
    expect(capaPublicaRecomendada("salao",null)).toMatch(/^\/temas\//);
    expect(capaPublicaRecomendada("outro",null)).toBeNull();
    expect(permitirPresetNovo(true,false,false)).toBe(false);
    expect(permitirPresetNovo(false,true,false)).toBe(false);
    expect(permitirPresetNovo(false,false,true)).toBe(false);
    const original=configPadrao({frase:"Texto editado, preservar", layout:"cortai-chat"});
    const result=preverPresetVisual(original,"salao");
    expect(result.layout).toBe("cortai-chat");
    expect(result.frase).toBe("Texto editado, preservar");
    expect(original.tema).toBe("cortai");
  });
});
