import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("layout Agendamento", () => {
  it("é compacto em todas as estruturas de tema, não o site com menos seções", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toContain(".fg.fg-rapido[data-estrutura] .fg-hero");
    expect(css).toMatch(/\.fg\.fg-rapido\[data-estrutura\] \.fg-hero,[\s\S]*?min-height: 0;/);
    expect(css).toContain(".fg.fg-rapido[data-estrutura] .fg-topo .fg-menu");
    const modelo = readFileSync("src/components/marca/modelos/SiteCompleto.tsx", "utf8");
    expect(modelo).toContain('variante === "agendamento"');
  });
});
