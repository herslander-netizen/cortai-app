import { describe, expect, it } from "vitest";

import { CURVA, ESCALA, ESPERA_MS, MOLA, TEMPO, molaFigaro } from "./movimento-figaro";

/** Volta do formato do framer-motion para o `dampingRatio` do Compose. */
function razao(m: { stiffness: number; damping: number; mass: number }) {
  return m.damping / (2 * Math.sqrt(m.stiffness * m.mass));
}

describe("molaFigaro", () => {
  it("converte dampingRatio e stiffness do Compose", () => {
    const m = molaFigaro(0.8, 380);
    expect(m).toMatchObject({ type: "spring", stiffness: 380, mass: 1 });
    expect(m.damping).toBeCloseTo(31.19, 1);
    expect(razao(m)).toBeCloseTo(0.8);
  });
});

describe("valores do Figaro (não mudar sem fonte no APK)", () => {
  it("molas do tema e dos componentes", () => {
    const esperado: Record<keyof typeof MOLA, [number, number]> = {
      rapidaEspacial: [0.6, 800],
      padraoEspacial: [0.8, 380],
      lentaEspacial: [0.8, 200],
      rapidaEfeito: [1, 3800],
      padraoEfeito: [1, 1600],
      lentaEfeito: [1, 800],
      tamanho: [1, 400],
      setaAcordeao: [0.75, 1500],
      padraoCompose: [1, 1500],
    };
    for (const [nome, [zeta, k]] of Object.entries(esperado)) {
      const m = MOLA[nome as keyof typeof MOLA];
      expect(m.stiffness, nome).toBe(k);
      expect(razao(m), nome).toBeCloseTo(zeta);
    }
  });

  it("curvas, tempos e escalas", () => {
    expect(CURVA.rapidaParaLenta).toEqual([0.4, 0, 0.2, 1]);
    expect(CURVA.linearParaLenta).toEqual([0, 0, 0.2, 1]);
    expect(TEMPO).toMatchObject({
      trocaIntra: 0.3,
      trocaCruzada: 0.35,
      etapaDeCadastro: 0.22,
      botaoEntra: 0.22,
      botaoAtraso: 0.09,
      botaoSai: 0.09,
      pulsoSobe: 0.14,
      pulsoAssenta: 0.1,
      pulsoAparece: 0.24,
      toast: 0.32,
    });
    expect(ESPERA_MS.carregandoMinimo).toBe(400);
    expect(ESCALA).toEqual({ aoTocar: 0.98, botaoEntra: 0.92, pulsoInicio: 0.85, pulsoPico: 1.05 });
  });
});
