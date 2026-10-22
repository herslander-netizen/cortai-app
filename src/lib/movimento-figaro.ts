/**
 * Movimento do Figaro (APK), convertido para a web. Decisão do dono de 22/10/2026: nas animações que
 * vêm do Figaro valem estes valores; os tokens de `motion.ts` e `--mov-*` seguem para o resto.
 * Fontes: `docs/referencia-figaro/apk/1-design-system.md` §5, `5-navegacao-e-transicoes.md` e
 * `6-animacoes.md`. Conversão e tabela: "Plano: trazer o Figaro para o Cortaí", P.3, no `DIARIO.md`.
 */

/** Curvas do Android, como `cubic-bezier`. */
export const CURVA = {
  /** `FastOutSlowInEasing`; também o padrão de `tween(n)` sem curva. */
  rapidaParaLenta: [0.4, 0, 0.2, 1],
  /** `LinearOutSlowInEasing`. */
  linearParaLenta: [0, 0, 0.2, 1],
  /** `FastOutLinearInEasing`. */
  rapidaParaLinear: [0.4, 0, 1, 1],
} as const;

export type MolaFigaro = {
  readonly type: "spring";
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: 1;
};

/**
 * `spring(dampingRatio, stiffness)` do Compose no formato do framer-motion. Com massa 1, o
 * amortecimento é `2 · ζ · √k`.
 */
export function molaFigaro(dampingRatio: number, stiffness: number): MolaFigaro {
  return { type: "spring", stiffness, damping: 2 * dampingRatio * Math.sqrt(stiffness), mass: 1 };
}

/** Molas do tema (`MotionScheme.expressive()`) e as usadas por componentes. */
export const MOLA = {
  /** Toque e escala de 0,98; tem um quique leve, como no Figaro. */
  rapidaEspacial: molaFigaro(0.6, 800),
  /** Título de etapa e dígito do odômetro. */
  padraoEspacial: molaFigaro(0.8, 380),
  lentaEspacial: molaFigaro(0.8, 200),
  /** Esmaecer do dígito do odômetro. */
  rapidaEfeito: molaFigaro(1, 3800),
  /** Esmaecer do título de etapa. */
  padraoEfeito: molaFigaro(1, 1600),
  /** Conteúdo da conclusão do onboarding. */
  lentaEfeito: molaFigaro(1, 800),
  /** Abrir e fechar tamanho (`expandSizeSpring`) e o `fadeIn()` sem spec. */
  tamanho: molaFigaro(1, 400),
  /** Seta do acordeão. */
  setaAcordeao: molaFigaro(0.75, 1500),
  /** Padrão do Compose: gaveta (`slideIntoContainer`) e setas sem spec. */
  padraoCompose: molaFigaro(1, 1500),
} as const;

/** Tempos fixos, em segundos (o framer-motion usa segundos). */
export const TEMPO = {
  trocaIntra: 0.3,
  trocaCruzada: 0.35,
  etapaDeCadastro: 0.22,
  etapaDeFluxo: 0.3,
  /** Conteúdo do botão principal: entra em 220 ms depois de 90 ms; sai em 90 ms. */
  botaoEntra: 0.22,
  botaoAtraso: 0.09,
  botaoSai: 0.09,
  /** Pulso de número: sobe até 1,05 em 140 ms, assenta em 100 ms; aparece em 240 ms. */
  pulsoSobe: 0.14,
  pulsoAssenta: 0.1,
  pulsoAparece: 0.24,
  toast: 0.32,
  conteudoEntra: 0.22,
  conteudoSai: 0.18,
  foto: 0.3,
} as const;

/** Valores em milissegundos usados fora da animação (temporizadores). */
export const ESPERA_MS = {
  /** O indicador de carregando fica pelo menos isto na tela (`FigarooLoadingMinDisplayMillis`). */
  carregandoMinimo: 400,
  /** O FAB estendido mostra o sucesso por este tempo. */
  sucessoDoFab: 700,
} as const;

/** Escalas do Figaro. */
export const ESCALA = {
  aoTocar: 0.98,
  botaoEntra: 0.92,
  pulsoInicio: 0.85,
  pulsoPico: 1.05,
} as const;

/**
 * Conclusão do onboarding (`OnboardingCompleteScreenKt`, spec 6 §4): o herói aparece em 520 ms, o
 * logotipo 800 ms depois, o link é digitado uma letra a cada 32 ms com o cursor piscando a cada 450 ms,
 * e a fonte do link vai de 18 a 14 para caber (passo de 1).
 */
export const CONCLUSAO = {
  heroSegundos: 0.52,
  logoAtrasoMs: 800,
  letraMs: 32,
  cursorMs: 450,
  heroPx: 140,
  fonteMaxPx: 18,
  fonteMinPx: 14,
} as const;
