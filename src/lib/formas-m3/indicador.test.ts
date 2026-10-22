import { describe, expect, it } from "vitest";

import { formasDoIndicador, fatorDeEscala } from "./formas";
import { caminhoDoQuadro, duracaoDaMolaMs, quadroNoTempo, valorDaMola } from "./indicador";
import { Transicao } from "./morph";

describe("indicador de carregamento (M3)", () => {
  it("monta as sete formas normalizadas num quadrado de lado 1", () => {
    const formas = formasDoIndicador();
    expect(formas).toHaveLength(7);
    for (const f of formas) {
      const [a, b, c, d] = f.limites(true);
      expect(Math.max(c - a, d - b)).toBeCloseTo(1, 3);
      expect(f.cubicas.length).toBeGreaterThan(3);
    }
  });

  it("calcula a escala sem passar do quadrado", () => {
    const fator = fatorDeEscala(formasDoIndicador());
    expect(fator).toBeGreaterThan(0.5);
    expect(fator).toBeLessThanOrEqual(1);
  });

  it("a mola 0,6/200 com limiar 0,1 dura cerca de 297 ms e quica acima de 1", () => {
    expect(duracaoDaMolaMs()).toBeGreaterThan(290);
    expect(duracaoDaMolaMs()).toBeLessThan(305);
    expect(valorDaMola(0)).toBe(0);
    expect(valorDaMola(200)).toBeGreaterThan(1);
    expect(valorDaMola(400)).toBe(1);
  });

  it("segue o ciclo de 650 ms: morph, descanso, próxima forma, +90°", () => {
    expect(quadroNoTempo(0)).toMatchObject({ indice: 0, progresso: 0 });
    expect(quadroNoTempo(100).progresso).toBeGreaterThan(0);
    const descanso = quadroNoTempo(500);
    expect(descanso).toMatchObject({ indice: 1, progresso: 0 });
    expect(quadroNoTempo(650 + 100).indice).toBe(1);
    expect(quadroNoTempo(650 * 6 + 500).indice).toBe(0);
    // O giro não dá salto na troca de forma (90·1 + alvo = 90·0 + alvo + 90).
    const antes = quadroNoTempo(duracaoDaMolaMs() - 1);
    const depois = quadroNoTempo(duracaoDaMolaMs() + 1);
    expect(Math.abs(depois.giro - antes.giro)).toBeLessThan(15);
  });

  it("cada transição liga duas formas e gera um contorno fechado em todo o ciclo", () => {
    const formas = formasDoIndicador();
    formas.forEach((f, i) => {
      const t = new Transicao(f, formas[(i + 1) % formas.length]!);
      for (const p of [0, 0.5, 1, 1.09]) {
        const c = t.cubicas(p);
        for (let k = 0; k < c.length; k++) {
          const prox = c[(k + 1) % c.length]!;
          expect(c[k]!.ancora1X).toBeCloseTo(prox.ancora0X, 3);
          expect(c[k]!.ancora1Y).toBeCloseTo(prox.ancora0Y, 3);
        }
      }
    });
  });

  it("gera um caminho SVG centralizado dentro dos 48 px", () => {
    for (let ms = 0; ms < 4700; ms += 97) {
      const d = caminhoDoQuadro(quadroNoTempo(ms), 48);
      expect(d.startsWith("M")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
      const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      expect(nums.every((n) => Number.isFinite(n))).toBe(true);
      expect(Math.min(...nums)).toBeGreaterThan(-6);
      expect(Math.max(...nums)).toBeLessThan(54);
    }
  });
});
