import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ficha = readFileSync("src/components/barbeiro/agenda/PainelAtendimento.tsx", "utf8");
const folha = readFileSync("src/components/ui/sheet.tsx", "utf8");
const css = readFileSync("src/styles.css", "utf8");

describe("ficha em duas etapas (dono, 26/10)", () => {
  it("abre na metade, sobe até a altura do conteúdo e não é mais cartão de um estado só", () => {
    expect(ficha).not.toContain("soFechar: true");
    expect(ficha).toContain("alturaDoConteudo,");
    expect(ficha).toContain("max-h-[55dvh]");
  });

  it("não rola na primeira etapa", () => {
    expect(ficha).toContain('expandida ? "overflow-y-auto');
    expect(ficha).toContain(': "overflow-hidden"');
  });

  it("no celular não mostra o X solto: a barrinha fecha", () => {
    expect(ficha).toContain("esconderX={!props.lateral}");
  });
});

describe("linha discreta no topo das gavetas de baixo", () => {
  it("a gaveta de baixo leva a classe e o CSS desenha a linha", () => {
    expect(folha).toContain('"gaveta-borda-de-cima inset-x-0 bottom-0');
    expect(css).toMatch(/\.gaveta-borda-de-cima \{\s*box-shadow: inset 0 1px 0 0/);
  });
});
