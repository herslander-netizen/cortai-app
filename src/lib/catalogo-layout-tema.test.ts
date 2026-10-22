import { describe, expect, it } from "vitest";

import {
  ajustarAoCatalogo,
  aplicarTema,
  configPadrao,
  LAYOUTS_DO_CATALOGO,
  temasDoLayout,
  trocarLayoutNoCatalogo,
} from "@/lib/pagina-config";

describe("catálogo de Layout & Tema (fluxo do Figaro)", () => {
  it("abre sempre com layout e tema do catálogo, mesmo em páginas antigas", () => {
    const antiga = {
      ...configPadrao(),
      layout: "cinematografico" as const,
      tema: "street" as const,
    };
    const c = ajustarAoCatalogo(antiga);
    expect(LAYOUTS_DO_CATALOGO).toContain(c.layout);
    expect(temasDoLayout(c.layout)).toContain(c.tema);
  });

  it("não mexe numa página que já está no catálogo", () => {
    const base = aplicarTema(
      trocarLayoutNoCatalogo(configPadrao(), "figaro-agendamento"),
      "figaro-rock-n-roll",
    );
    expect(ajustarAoCatalogo(base)).toEqual(base);
  });

  it("ao trocar o layout mantém o tema que o novo layout oferece", () => {
    const base = aplicarTema(
      trocarLayoutNoCatalogo(configPadrao(), "figaro-site-completo"),
      "feminino-rose",
    );
    const c = trocarLayoutNoCatalogo(base, "figaro-agendamento");
    expect(c.layout).toBe("figaro-agendamento");
    expect(c.tema).toBe("feminino-rose");
  });

  it("cada layout lista seus temas, com ao menos um", () => {
    for (const layout of LAYOUTS_DO_CATALOGO)
      expect(temasDoLayout(layout).length).toBeGreaterThan(0);
  });
});
