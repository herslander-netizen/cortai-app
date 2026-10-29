import { describe, expect, it } from "vitest";

import { ALVO_ESCALA_TOQUE, MOVIMENTO_FIGAROO, molaPrecisao } from "./motion";

describe("tokens de movimento de precisão Figaroo", () => {
  it("usa mola criticamente amortecida sem overshoot", () => {
    expect(molaPrecisao).toEqual({
      type: "spring",
      stiffness: 400,
      damping: 40,
      mass: 1,
    });
    expect(molaPrecisao.damping / (2 * Math.sqrt(molaPrecisao.stiffness * molaPrecisao.mass))).toBe(1);
  });

  it("preserva as constantes de toque, FAB, drawer e cabeçalho da agenda", () => {
    expect(ALVO_ESCALA_TOQUE).toBe(0.98);
    expect(MOVIMENTO_FIGAROO).toMatchObject({
      duracaoRapida: 0.12,
      duracaoBase: 0.2,
      duracaoMorfismoFab: 0.22,
      sucessoFabMs: 700,
      escalaRotuloMinima: 0.7,
      diametroFab: 56,
      elevacaoFab: 6,
      tamanhoLoading: 32,
      espacamentoIconeRotulo: 12,
      alphaContainerDesabilitado: 0.55,
      alphaConteudoDesabilitado: 0.85,
      larguraDrawer: 348,
      limiarDrawerAbertura: 0.3,
      alphaScrimDrawer: 0.95,
      alturaAgendaColapsada: 64,
      alturaAgendaExpandida: 152,
      deslocamentoRevelacaoAgenda: 6,
      atrasoCascata: 0.03,
      duracaoMovimentoReduzido: 0.15,
    });
  });
});
