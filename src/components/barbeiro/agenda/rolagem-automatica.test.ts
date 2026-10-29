import { describe, expect, it } from "vitest";

import {
  FAIXA_DA_BORDA_PX,
  QUADRO_MAXIMO_ROLAGEM_MS,
  VELOCIDADE_MAXIMA_ROLAGEM_PX_SEG,
  deslocamentoDeRolagem,
  velocidadeDeRolagemNaBorda,
} from "./rolagem-automatica";

describe("rolagem automática da Timeline", () => {
  it("acelera linearmente até o limite ao aproximar o dedo da borda superior", () => {
    expect(velocidadeDeRolagemNaBorda(100, 100, 700)).toBe(-VELOCIDADE_MAXIMA_ROLAGEM_PX_SEG);
    expect(velocidadeDeRolagemNaBorda(100 + FAIXA_DA_BORDA_PX / 2, 100, 700)).toBe(-360);
    expect(velocidadeDeRolagemNaBorda(100 + FAIXA_DA_BORDA_PX, 100, 700)).toBe(0);
  });

  it("acelera linearmente até o limite na borda inferior", () => {
    expect(velocidadeDeRolagemNaBorda(700, 100, 700)).toBe(VELOCIDADE_MAXIMA_ROLAGEM_PX_SEG);
    expect(velocidadeDeRolagemNaBorda(700 - FAIXA_DA_BORDA_PX / 2, 100, 700)).toBe(360);
    expect(velocidadeDeRolagemNaBorda(700 - FAIXA_DA_BORDA_PX, 100, 700)).toBe(0);
  });

  it("não rola no meio nem salta depois de um quadro atrasado", () => {
    expect(velocidadeDeRolagemNaBorda(400, 100, 700)).toBe(0);
    expect(deslocamentoDeRolagem(720, 16)).toBeCloseTo(11.52);
    expect(deslocamentoDeRolagem(720, 100)).toBeCloseTo((720 * QUADRO_MAXIMO_ROLAGEM_MS) / 1000);
    expect(deslocamentoDeRolagem(720, -1)).toBe(0);
  });
});
