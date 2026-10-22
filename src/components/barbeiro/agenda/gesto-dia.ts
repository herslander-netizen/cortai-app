import { useSyncExternalStore } from "react";

/** Decisão pura do gesto lateral que troca o dia da Agenda. */
export const BORDA_DO_SISTEMA = 24;

export type InicioDoGesto = {
  x: number;
  y: number;
  larguraTela: number;
  dentroDeRolagemLateral: boolean;
  arrastando: boolean;
};

/** O toque pode virar troca de dia? (borda do sistema, rolagem lateral e arrasto ficam de fora) */
export function gestoPodeComecar(g: InicioDoGesto) {
  if (g.arrastando || g.dentroDeRolagemLateral) return false;
  return g.x >= BORDA_DO_SISTEMA && g.x <= g.larguraTela - BORDA_DO_SISTEMA;
}

/** Algum ancestral rola para os lados (colunas por profissional, chips)? */
export function dentroDeRolagemLateral(alvo: Element | null, limite?: Element | null) {
  for (let el = alvo; el && el !== limite; el = el.parentElement) {
    if (el.classList.contains("agenda-chips")) return true;
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

/* ---------- Gesto que acompanha o dedo ---------- */
export const TRAVA_EIXO = 10;
export const FRACAO_PARA_COMPLETAR = 0.5;
// `HorizontalPager` do Figaro: o fling troca de página a partir de 400 dp/s (padrão do Compose).
export const PETELECO_VELOCIDADE = 0.4; // px/ms
export const PETELECO_DISTANCIA = 10; // px
export const PETELECO_JANELA_MS = 250;

export type Eixo = "x" | "y" | null;

/** Horizontal só quando claramente horizontal: o polegar rola na diagonal. */
export const RAZAO_EIXO_X = 1.5;

/** Nos primeiros ~10 px decide o eixo; depois a decisão não muda. */
export function travarEixo(dx: number, dy: number, atual: Eixo = null): Eixo {
  if (atual) return atual;
  if (Math.hypot(dx, dy) < TRAVA_EIXO) return null;
  return Math.abs(dx) > Math.abs(dy) * RAZAO_EIXO_X ? "x" : "y";
}

/** O dia nunca anda mais que a largura da tela. */
export function limitarDeslocamento(dx: number, largura: number) {
  return Math.max(-largura, Math.min(largura, dx));
}

export type Amostra = { x: number; t: number };

/** Velocidade (px/ms) e distância nos últimos 250 ms. */
export function movimentoRecente(amostras: Amostra[], agora: number) {
  const recentes = amostras.filter((a) => agora - a.t <= PETELECO_JANELA_MS);
  const primeira = recentes[0];
  const ultima = recentes[recentes.length - 1];
  if (!primeira || !ultima || ultima.t === primeira.t) return { velocidade: 0, distancia: 0 };
  const distancia = ultima.x - primeira.x;
  return { velocidade: distancia / (ultima.t - primeira.t), distancia };
}

/** -1 = dia anterior, 1 = próximo, 0 = volta para o lugar. */
export function decidirFimDoGesto(f: {
  inicio: InicioDoGesto | null;
  eixo: Eixo;
  dx: number;
  largura: number;
  velocidade: number;
  distanciaRecente: number;
  cancelado?: boolean;
  arrastandoNoFim?: boolean;
}): -1 | 0 | 1 {
  if (!f.inicio || f.cancelado || f.arrastandoNoFim || f.eixo !== "x") return 0;
  if (!gestoPodeComecar(f.inicio) || f.dx === 0) return 0;
  const direcao = f.dx < 0 ? 1 : -1;
  const passouMetade = Math.abs(f.dx) >= f.largura * FRACAO_PARA_COMPLETAR;
  const peteleco =
    Math.abs(f.velocidade) >= PETELECO_VELOCIDADE &&
    Math.abs(f.distanciaRecente) >= PETELECO_DISTANCIA &&
    Math.sign(f.velocidade) === Math.sign(f.dx);
  return passouMetade || peteleco ? direcao : 0;
}

/* ---------- Dia vizinho visível durante o gesto ----------
 * Estado externo: só a prévia redesenha; a Agenda inteira fica parada. */
let vizinho: -1 | 0 | 1 = 0;
const ouvintes = new Set<() => void>();
export function definirVizinhoDoGesto(d: -1 | 0 | 1) {
  if (vizinho === d) return;
  vizinho = d;
  ouvintes.forEach((o) => o());
}
export function vizinhoDoGesto() {
  return vizinho;
}
function assinar(o: () => void) {
  ouvintes.add(o);
  return () => ouvintes.delete(o);
}
export function useVizinhoDoGesto() {
  return useSyncExternalStore(assinar, vizinhoDoGesto, () => 0 as const);
}
