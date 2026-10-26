import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ficha = readFileSync("src/components/barbeiro/agenda/PainelAtendimento.tsx", "utf8");

describe("ficha em duas etapas (dono, 26/10)", () => {
  it("abre na metade, sobe até a altura do conteúdo e não é mais cartão de um estado só", () => {
    expect(ficha).not.toContain("soFechar: true");
    expect(ficha).toContain("alturaDoConteudo,");
    expect(ficha).toContain("max-h-[62dvh]");
  });

  it("não rola na primeira etapa", () => {
    expect(ficha).toContain('expandida ? "overflow-y-auto');
    expect(ficha).toContain(': "overflow-hidden"');
  });

  it("tocar na barrinha expande quando há conteúdo guardado", () => {
    expect(ficha).toContain("onClick={tocarNaBarrinha}");
  });

  it("no celular não mostra o X solto: a barrinha fecha", () => {
    expect(ficha).toContain("esconderX={!props.lateral}");
  });
});
