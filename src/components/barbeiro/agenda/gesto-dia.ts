/** Decisão pura do gesto lateral que troca o dia da Agenda. */
export const DESLOCAMENTO_MIN_X = 70;
export const DESLOCAMENTO_MAX_Y = 40;
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

/** -1 = dia anterior, 1 = próximo dia, 0 = não troca. */
export function deveTrocarDia(f: {
  inicio: InicioDoGesto | null;
  fimX: number;
  fimY: number;
  cancelado?: boolean;
  arrastandoNoFim?: boolean;
}): -1 | 0 | 1 {
  if (!f.inicio || f.cancelado || f.arrastandoNoFim || !gestoPodeComecar(f.inicio)) return 0;
  const dx = f.fimX - f.inicio.x;
  const dy = f.fimY - f.inicio.y;
  if (Math.abs(dx) > DESLOCAMENTO_MIN_X && Math.abs(dy) < DESLOCAMENTO_MAX_Y)
    return dx < 0 ? 1 : -1;
  return 0;
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
export const PETELECO_VELOCIDADE = 0.5; // px/ms
export const PETELECO_DISTANCIA = 50; // px
export const PETELECO_JANELA_MS = 250;

export type Eixo = "x" | "y" | null;

/** Nos primeiros ~10 px decide o eixo; depois a decisão não muda. */
export function travarEixo(dx: number, dy: number, atual: Eixo = null): Eixo {
  if (atual) return atual;
  if (Math.hypot(dx, dy) < TRAVA_EIXO) return null;
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
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
