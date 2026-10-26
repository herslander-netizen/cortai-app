import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ficha = readFileSync("src/components/barbeiro/agenda/PainelAtendimento.tsx", "utf8");

describe("ficha em duas etapas (dono, 26/10)", () => {
  it("abre na metade, sobe até a altura do conteúdo e não é mais cartão de um estado só", () => {
    expect(ficha).not.toContain("soFechar: true");
    expect(ficha).toContain("alturaDoConteudo,");
    expect(ficha).toContain("max-h-[62dvh]");
  });

  it("nunca rola por dentro no celular, nem na etapa cheia", () => {
    expect(ficha).toContain('"overflow-hidden pb-2"');
    expect(ficha).not.toContain('expandida ? "overflow-y-auto');
  });

  it("o gesto vale na ficha inteira", () => {
    expect(ficha).toContain("useFolhaEmDoisEstados(folha, folha, {");
  });

  it("tocar na barrinha expande quando há conteúdo guardado", () => {
    expect(ficha).toContain("onClick={tocarNaBarrinha}");
  });

  it("no celular não mostra o X solto: a barrinha fecha", () => {
    expect(ficha).toContain("esconderX={!props.lateral}");
  });
});
