/** Tokens de movimento do Cortaí — consistentes, perceptíveis e sem excesso. */

/**
 * Durações globais. A interface deve acompanhar o usuário, mas permitir perceber
 * o movimento; gestos diretos continuam ligados ao dedo e não dependem destes tempos.
 */
export const DURACAO = { rapida: 0.22, base: 0.38, lenta: 0.52 } as const;

export const SUAVE = [0.2, 0, 0, 1] as const;

export const transicaoBase = { duration: DURACAO.base, ease: SUAVE } as const;
export const transicaoRapida = { duration: DURACAO.rapida, ease: SUAVE } as const;
export const molaFolha = { type: "spring", stiffness: 420, damping: 38 } as const;


/**
 * Tokens de precisão Figaroo. São aditivos: não substituem os tokens legados acima,
 * pois telas existentes já dependem de seus tempos e parâmetros.
 */
export const ALVO_ESCALA_TOQUE = 0.98;

/** Amortecimento crítico (ζ = 1): stiffness 400, massa 1, damping = 2 × √400 = 40. */
export const molaPrecisao = { type: "spring", stiffness: 400, damping: 40, mass: 1 } as const;

/** Parâmetros de componentes Figaroo em unidades CSS equivalentes a dp. */
export const MOVIMENTO_FIGAROO = {
  duracaoRapida: 0.12,
  duracaoBase: 0.2,
  duracaoMorfismoFab: 0.22,
  sucessoFabMs: 700,
  escalaRotuloMinima: 0.7,
  diametroFab: 56,
  elevacaoFab: 6,
  tamanhoLoading: 32,
  espacamentoIconeRotulo: 12,
  alphaContainerDesabilitado: 0.55,
  alphaConteudoDesabilitado: 0.85,
  larguraDrawer: 348,
  limiarDrawerAbertura: 0.3,
  alphaScrimDrawer: 0.95,
  alturaAgendaColapsada: 64,
  alturaAgendaExpandida: 152,
  deslocamentoRevelacaoAgenda: 6,
  atrasoCascata: 0.03,
  duracaoMovimentoReduzido: 0.15,
} as const;

/**
 * Molas com amortecimento suficiente para assentar sem quique.
 * Não alterar cores, tipografia, raios, sombras ou identidade visual por meio destes tokens.
 */
/** Movimento curto: resposta tátil visual, chips e controles. */
export const molaRapida = { type: "spring", stiffness: 900, damping: 54, mass: 1 } as const;
/** Movimento médio: cartões, folhas e painéis. */
export const molaBase = { type: "spring", stiffness: 480, damping: 42, mass: 1 } as const;
/** Movimento amplo: telas e troca de dia; lento o bastante para ser acompanhado. */
export const molaLenta = { type: "spring", stiffness: 220, damping: 34, mass: 1 } as const;
/** Cor e opacidade: suaves, sem quique. */
export const molaEfeito = { type: "spring", stiffness: 1000, damping: 72, mass: 1 } as const;

/** Com "reduzir movimento": só esmaece, em até 150 ms. */
export const transicaoReduzida = { duration: 0.15, ease: SUAVE } as const;

/** Entrada de página: esmaece e sobe discretamente. */
export const pagina = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: transicaoBase,
};

/** Entrada em cascata curta; evita animar longas listas inteiras. */
export const LIMITE_CASCATA = 6;
export function cascata(indice: number) {
  const animar = indice < LIMITE_CASCATA;
  const i = Math.min(indice, LIMITE_CASCATA - 1);
  return {
    initial: animar ? { opacity: 0, y: 6 } : false,
    animate: { opacity: 1, y: 0 },
    transition: animar
      ? { duration: DURACAO.base, ease: SUAVE, delay: i * 0.04 }
      : { duration: 0 },
  };
}

export function prefereMenosMovimento() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
