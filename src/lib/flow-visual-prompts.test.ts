import { describe, expect, it } from "vitest";
import { SEGMENTOS } from "@/lib/segmentos";
import { especificacoesDeImagemDoSegmento, todasEspecificacoesVisuais } from "./flow-visual-prompts";

describe("catálogo de geração futura da Biblioteca Flow", () => {
  it("prepara 14 slots para cada segmento oficial, sem fingir mídia gerada", () => {
    const todos = todasEspecificacoesVisuais();
    expect(todos).toHaveLength(SEGMENTOS.length * 14);
    expect(new Set(todos.map(i=>i.id)).size).toBe(todos.length);
    expect(todos.every(i=>i.storagePath===null)).toBe(true);
  });
  it("mantém as categorias da missão sem misturar IDs", () => {
    for(const segmento of SEGMENTOS){
      const itens=especificacoesDeImagemDoSegmento(segmento);
      const count=(tipo:string)=>itens.filter(i=>i.tipo===tipo).length;
      expect([count("hero"),count("galeria"),count("servico"),count("apoio"),count("fundo")]).toEqual([2,6,3,2,1]);
      expect(itens.every(i=>i.segmento===segmento && !i.prompt.includes("watermark") && i.negativo.includes("watermarks"))).toBe(true);
    }
  });
});
