/**
 * Linha do tempo do `LoadingIndicator` do Material 3, como o Figaro o usa (48 dp, cor primária;
 * `FigarooLoadingIndicator` → `LoadingIndicatorKt`). Tudo sai do APK:
 *
 * - a cada 650 ms começa uma transição para a próxima das 7 formas, com mola (ζ 0,6; k 200) e limiar
 *   de visibilidade 0,1, que dura o que `estimateAnimationDurationMillis` calcula (~297 ms);
 * - no fim da mola o índice avança, o progresso volta a 0 e o ângulo-alvo ganha +90° (começa em 90°);
 * - gira ainda 4666 ms por volta (linear, sem parar) e mais 90° × progresso da mola;
 * - o contorno é escalado por `fatorDeEscala × 38/48` e centralizado pela caixa dos pontos da curva.
 *
 * A função é pura (tempo → quadro), para o componente só chamar a cada frame e os testes conferirem.
 */
import type { Cubica } from "./geometria";
import { fatorDeEscala, formasDoIndicador } from "./formas";
import { Transicao } from "./morph";

export const INTERVALO_MS = 650;
export const VOLTA_GLOBAL_MS = 4666;
export const ANGULO_INICIAL = 90;
const ZETA = 0.6;
const RIGIDEZ = 200;
const LIMIAR = 0.1;
const ESCALA_ATIVA = 38 / 48;

/** Duração da mola em ms (`estimateAnimationDurationMillis`, caso subamortecido, deslocamento 1). */
export function duracaoDaMolaMs(zeta = ZETA, rigidez = RIGIDEZ, limiar = LIMIAR): number {
  const w = Math.sqrt(rigidez);
  const real = -zeta * w;
  const imaginario = w * Math.sqrt(1 - zeta * zeta);
  const c2 = (0 - real * 1) / imaginario;
  return Math.floor((Math.log(limiar / Math.sqrt(1 + c2 * c2)) / real) * 1000);
}

/** Valor da mola (de 0 a 1, com o quique) em `ms` depois de lançada; ao fim da duração vale 1. */
export function valorDaMola(ms: number, zeta = ZETA, rigidez = RIGIDEZ, limiar = LIMIAR): number {
  if (ms >= duracaoDaMolaMs(zeta, rigidez, limiar)) return 1;
  const t = ms / 1000;
  const w = Math.sqrt(rigidez);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}

export type QuadroDoIndicador = {
  /** Índice da transição desenhada (0 a 6). */
  indice: number;
  /** Progresso da mola dentro dela (passa de 1 no quique). */
  progresso: number;
  /** Giro total em graus. */
  giro: number;
};

export function quadroNoTempo(ms: number): QuadroDoIndicador {
  const t = Math.max(0, ms);
  const lancamentos = Math.floor(t / INTERVALO_MS);
  const dentro = t - lancamentos * INTERVALO_MS;
  const duracao = duracaoDaMolaMs();
  const terminou = dentro >= duracao;
  const concluidas = lancamentos + (terminou ? 1 : 0);
  const progresso = terminou ? 0 : valorDaMola(dentro);
  const global = ((t % VOLTA_GLOBAL_MS) / VOLTA_GLOBAL_MS) * 360;
  return {
    indice: concluidas % 7,
    progresso,
    giro: 90 * progresso + ((ANGULO_INICIAL + 90 * concluidas) % 360) + global,
  };
}

let transicoes: Transicao[] | null = null;
let escala = 0;

function preparar() {
  if (!transicoes) {
    const formas = formasDoIndicador();
    transicoes = formas.map((f, i) => new Transicao(f, formas[(i + 1) % formas.length]!));
    escala = fatorDeEscala(formas) * ESCALA_ATIVA;
  }
  return { transicoes, escala };
}

/** Caminho SVG do contorno num quadrado de `tamanho` px, já escalado e centralizado. */
export function caminhoDoQuadro(quadro: QuadroDoIndicador, tamanho: number): string {
  const { transicoes: lista, escala: fator } = preparar();
  const cubicas: Cubica[] = lista[quadro.indice]!.cubicas(quadro.progresso);
  const s = tamanho * fator;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of cubicas) {
    for (let i = 0; i < 8; i += 2) {
      const x = c.pontos[i]! * s;
      const y = c.pontos[i + 1]! * s;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const dx = tamanho / 2 - (minX + maxX) / 2;
  const dy = tamanho / 2 - (minY + maxY) / 2;
  const n = (v: number) => (Math.round(v * 100) / 100).toString();
  const p = (c: Cubica, i: number) => `${n(c.pontos[i]! * s + dx)} ${n(c.pontos[i + 1]! * s + dy)}`;
  let d = `M${p(cubicas[0]!, 0)}`;
  for (const c of cubicas) d += `C${p(c, 2)} ${p(c, 4)} ${p(c, 6)}`;
  return `${d}Z`;
}
