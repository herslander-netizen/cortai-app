import { CONCLUSAO } from "@/lib/movimento-figaro";

/** Trecho já digitado do link (as primeiras `n` letras). */
export function trechoDigitado(texto: string, n: number): string {
  return texto.slice(0, Math.max(0, Math.min(n, texto.length)));
}

/** Tempo total para digitar o link, em milissegundos. */
export function duracaoDaDigitacao(texto: string): number {
  return texto.length * CONCLUSAO.letraMs;
}

/**
 * Tamanho da fonte do link: 18 px, diminuindo de 1 em 1 até 14 px para caber na largura disponível
 * (`URL_AUTOSIZE_MAX/MIN/STEP` do Figaro). Estima a largura de uma letra em 0,56 do tamanho da fonte.
 */
export function fonteDoLink(texto: string, larguraPx: number): number {
  for (let fonte: number = CONCLUSAO.fonteMaxPx; fonte > CONCLUSAO.fonteMinPx; fonte--) {
    if (texto.length * fonte * 0.56 <= larguraPx) return fonte;
  }
  return CONCLUSAO.fonteMinPx;
}
