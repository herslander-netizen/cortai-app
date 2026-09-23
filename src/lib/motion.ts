/** Tokens de movimento do Cortaí 2.0 — curtos, discretos e consistentes. */

export const DURACAO = { rapida: 0.12, base: 0.2, lenta: 0.28 } as const;

export const SUAVE = [0.2, 0, 0, 1] as const;

export const transicaoBase = { duration: DURACAO.base, ease: SUAVE } as const;
export const transicaoRapida = { duration: DURACAO.rapida, ease: SUAVE } as const;
export const molaFolha = { type: "spring", stiffness: 420, damping: 38 } as const;

/** Entrada de página: esmaece e sobe um pouco. */
export const pagina = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: transicaoBase,
};

/** Entrada em cascata para listas (no máximo 8 itens animados). */
export const LIMITE_CASCATA = 8;
export function cascata(indice: number) {
  const i = Math.min(indice, LIMITE_CASCATA);
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURACAO.base, ease: SUAVE, delay: i * 0.03 },
  };
}

export function prefereMenosMovimento() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
