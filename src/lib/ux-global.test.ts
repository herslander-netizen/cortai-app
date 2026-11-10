import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DURACAO, transicaoReduzida } from "./motion";

const estilos = readFileSync(new URL("../styles.css", import.meta.url), "utf-8");

/**
 * Guardas pequenas para impedir que o contrato de movimento e rolagem móvel
 * volte a divergir. Não substituem validação visual em um aparelho real.
 */
describe("fundação UX global", () => {
  it("mantém as durações CSS alinhadas aos tokens de movimento", () => {
    expect(estilos).toContain(`--mov-rapido: ${DURACAO.rapida * 1000}ms;`);
    expect(estilos).toContain(`--mov-base: ${DURACAO.base * 1000}ms;`);
    expect(estilos).toContain(`--mov-lento: ${DURACAO.lenta * 1000}ms;`);
    expect(transicaoReduzida.duration).toBeLessThanOrEqual(0.15);
  });

  it("deixa a página controlar a rolagem da timeline em toda largura mobile", () => {
    expect(estilos).toMatch(
      /@media \(max-width: 767px\) \{\s*\.agenda-timeline-wrap \{\s*overflow: visible;\s*overflow-x: clip;\s*\}\s*\.agenda-timeline-scroll \{\s*max-height: none;\s*overflow: visible;\s*overflow-x: clip;\s*overscroll-behavior: auto;/,
    );
  });
});
