import { describe, expect, it } from "vitest";

import { avaliarCorpus } from "./avaliar";
import { CORPUS, ENTIDADES } from "./frases-ptbr";

/**
 * Linha de base do entendimento (05/11/2026): o motor não pode piorar. Quando o vocabulário for ensinado, suba os
 * pisos para os números novos — o relatório completo sai com `bun scripts/avaliar-entendimento.ts`.
 */
const PISO = {
  suportadas: 0.69,
  variacoes: 0.99,
  entidades: 0.72,
  maxDisparosIndevidos: 38,
};

describe("corpus pt-BR do atendimento", () => {
  const a = avaliarCorpus();

  it("tem frases de todas as intenções da taxonomia e entidades", () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(390);
    expect(new Set(CORPUS.map((f) => f.intencao)).size).toBe(33);
    expect(ENTIDADES.length).toBeGreaterThanOrEqual(50);
  });

  it("não piora o entendimento das intenções que o motor já tem", () => {
    expect(a.suportadas.taxa).toBeGreaterThanOrEqual(PISO.suportadas);
  });

  it("não aumenta os disparos indevidos (agendar, cancelar, confirmar por engano)", () => {
    expect(a.disparosIndevidos.length).toBeLessThanOrEqual(PISO.maxDisparosIndevidos);
  });

  it("continua robusto a maiúsculas, acentos, saudação, 'por favor' e abreviações", () => {
    expect(a.variacoes.taxa).toBeGreaterThanOrEqual(PISO.variacoes);
  });

  it("não piora a leitura de datas, horários e serviços", () => {
    expect(a.entidades.taxa).toBeGreaterThanOrEqual(PISO.entidades);
  });
});
