/** Tokens de movimento do Cortaí 2.0 — curtos, discretos e consistentes. */

export const DURACAO = { rapida: 0.12, base: 0.2, lenta: 0.28 } as const;

export const SUAVE = [0.2, 0, 0, 1] as const;

export const transicaoBase = { duration: DURACAO.base, ease: SUAVE } as const;
export const transicaoRapida = { duration: DURACAO.rapida, ease: SUAVE } as const;
export const molaFolha = { type: "spring", stiffness: 420, damping: 38 } as const;

/**
 * Mola de precisão para componentes que não podem ultrapassar o destino.
 * No modelo de mola do Framer Motion, damping = 2 * sqrt(stiffness * mass)
 * produz amortecimento crítico. Para stiffness=400 e mass=1, damping=40.
 * Mantemos este token separado para não alterar o movimento dos componentes existentes.
 */
export const molaPrecisao = { type: "spring", stiffness: 400, damping: 40, mass: 1 } as const;

/** Escala tátil padrão para pressionar botões e superfícies interativas. */
export const ESCALA_TOQUE = 0.98 as const;

/**
 * Tokens de mola de resposta rápida. Com damping ratio próximo de 0,9,
 * podem apresentar um pequeno overshoot; não assumir ausência absoluta de quique.
 * Use molaPrecisao quando o requisito for movimento sem overshoot.
 */
/** ≈120 ms de resposta percebida: toque e chips. */
export const molaRapida = { type: "spring", stiffness: 1400, damping: 67.3, mass: 1 } as const;
/** ≈200 ms de resposta percebida: folhas e painéis. */
export const molaBase = { type: "spring", stiffness: 700, damping: 47.6, mass: 1 } as const;
/** ≈280 ms de resposta percebida: tela inteira e troca de dia. */
export const molaLenta = { type: "spring", stiffness: 300, damping: 31.2, mass: 1 } as const;
/** Cor e opacidade: damping ratio crítico (1,0). */
export const molaEfeito = { type: "spring", stiffness: 1600, damping: 80, mass: 1 } as const;

/** Com "reduzir movimento": só esmaece, em até 150 ms. */
export const transicaoReduzida = { duration: 0.15, ease: SUAVE } as const;

/** Entrada de página: esmaece e sobe um pouco. */
export const pagina = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: transicaoBase,
};

/** Entrada em cascata para listas (no máximo 8 itens animados). */
export const LIMITE_CASCATA = 6;
export function cascata(indice: number) {
  const animar = indice < LIMITE_CASCATA;
  const i = Math.min(indice, LIMITE_CASCATA - 1);
  return {
    initial: animar ? { opacity: 0, y: 6 } : false,
    animate: { opacity: 1, y: 0 },
    transition: animar ? { duration: DURACAO.base, ease: SUAVE, delay: i * 0.03 } : { duration: 0 },
  };
}

export function prefereMenosMovimento() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
