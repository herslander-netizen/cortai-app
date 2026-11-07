import { describe, expect, it } from "vitest";

import { CAPITULOS } from "@/components/entrada/historias/capitulos";
import { TEXTOS_DOS_CAPITULOS } from "./textos-dos-capitulos";

describe("textos dos capítulos da página pública", () => {
  it("há texto para todo capítulo da entrada", () => {
    for (const c of CAPITULOS) expect(TEXTOS_DOS_CAPITULOS[c.id], c.id).toBeDefined();
  });

  it("seguem o mesmo molde: título curto, uma frase curta e três tópicos curtos", () => {
    for (const [id, t] of Object.entries(TEXTOS_DOS_CAPITULOS)) {
      expect(t.etiqueta.length, `${id} etiqueta`).toBeLessThanOrEqual(18);
      expect(t.titulo.length, `${id} título`).toBeLessThanOrEqual(52);
      expect(t.texto.length, `${id} frase`).toBeLessThanOrEqual(70);
      expect(t.texto.split(/[.!?]\s/).length, `${id} é uma frase só`).toBe(1);
      expect(t.itens, id).toHaveLength(3);
      for (const item of t.itens) expect(item.length, `${id}: ${item}`).toBeLessThanOrEqual(30);
    }
  });
});
