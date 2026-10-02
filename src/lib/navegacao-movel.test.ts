import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { itensDoDiaADiaNoMenuMovel } from "./navegacao-barbeiro";

describe("navegação móvel", () => {
  it("leva os antigos atalhos para Dia a dia e mantém a Agenda primeiro", () => {
    const itens = itensDoDiaADiaNoMenuMovel([
      "criar_agendamento",
      "visualizar_clientes",
      "visualizar_financeiro",
    ]);
    expect(itens[0]?.to).toBe("/barbeiro");
    expect(itens.map((item) => item.to)).toEqual(
      expect.arrayContaining([
        "/barbeiro",
        "/barbeiro/clientes",
        "/barbeiro/caixa",
        "/barbeiro/fila",
      ]),
    );
  });

  it("não renderiza mais a barra inferior", () => {
    const fonte = readFileSync("src/components/layout/NavegacaoEquipe.tsx", "utf8");
    expect(fonte).not.toContain("equipe-barra");
  });
});
