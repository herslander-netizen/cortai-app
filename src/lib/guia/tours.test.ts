import { execSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { GUIAS, guiaDaRota, seletorDoPasso } from "./tours";

/** Passo a passo atualizado (dono, 06/11/2026: "está bem desatualizado"). */
describe("guias das telas", () => {
  it("todo passo aponta algo que existe no código (data-guia ou seletor)", () => {
    const codigo = execSync(
      'grep -rhoE \'data-guia="[a-z-]+"|guia="[a-z-]+"|"data-guia": "[a-z-]+"|aria-label="[^"]+"|agenda-[a-z-]+|sino-de-avisos\' src',
      {
        encoding: "utf8",
      },
    );
    for (const g of GUIAS)
      for (const p of g.passos) {
        const procura = p.alvo.startsWith("css:")
          ? p.alvo
              .slice(4)
              .replace(/^\[aria-label="(.+)"\]$/, 'aria-label="$1"')
              .replace(/^\./, "")
          : `"${p.alvo}"`;
        expect(codigo, `${g.id}/${p.alvo}`).toContain(procura);
      }
  });

  it("a tela inicial do painel é a Agenda (não há mais Dashboard) e sem símbolo de segmento", () => {
    expect(guiaDaRota("/barbeiro")?.nome).toBe("Agenda");
    const textos = JSON.stringify(GUIAS);
    expect(textos).not.toMatch(/tesoura|dashboard/i);
    expect(guiaDaRota("/barbeiro/fila")?.nome).toBe("Lista de espera");
    expect(guiaDaRota("/barbeiro/horarios")?.nome).toBe("Horários");
  });

  it("seletor: css: usa o seletor; o resto é data-guia", () => {
    expect(seletorDoPasso("css:.sino-de-avisos")).toBe(".sino-de-avisos");
    expect(seletorDoPasso("espera-regras")).toBe('[data-guia="espera-regras"]');
  });
});
