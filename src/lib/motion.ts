/** Tokens de movimento do Cortaí 2.0 — curtos, discretos e consistentes. */

export const DURACAO = { rapida: 0.18, base: 0.32, lenta: 0.46 } as const;

export const SUAVE = [0.2, 0, 0, 1] as const;

export const transicaoBase = { duration: DURACAO.base, ease: SUAVE } as const;
export const transicaoRapida = { duration: DURACAO.rapida, ease: SUAVE } as const;
export const molaFolha = { type: "spring", stiffness: 420, damping: 38 } as const;

/**
 * Molas oficiais — "Standard" do Material 3 (amortecimento 0,9 a 1,0).
 * Chegam ao lugar sem passar do ponto (sem quique).
 */
/** Movimento curto, mas perceptível: toque e chips. */
export const molaRapida = { type: "spring", stiffness: 900, damping: 54, mass: 1 } as const;
/** Movimento médio: folhas e painéis entram e assentam com mais calma. */
export const molaBase = { type: "spring", stiffness: 480, damping: 42, mass: 1 } as const;
/** Movimento amplo: telas e troca de dia ficam mais lentas e fáceis de acompanhar. */
export const molaLenta = { type: "spring", stiffness: 220, damping: 34, mass: 1 } as const;
/** Cor e opacidade: suaves, sem quique. */
export const molaEfeito = { type: "spring", stiffness: 1000, damping: 72, mass: 1 } as const;

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
