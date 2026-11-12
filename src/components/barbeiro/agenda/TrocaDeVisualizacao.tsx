import { AnimatePresence, motion, usePresence, useReducedMotion } from "framer-motion";
import { forwardRef, useEffect, useRef, type AnimationEvent, type ReactNode } from "react";
import "./TrocaDeVisualizacao.css";

const SUAVE = [0.22, 1, 0.36, 1] as const;

type PainelProps = { children: ReactNode; animarEntrada: boolean; reduzirMovimento: boolean };

/**
 * A timeline é extensa no celular: transform e opacity animam por keyframes
 * nativos (compositor), sem atualizar o deslocamento no JavaScript a cada frame.
 * usePresence mantém a saída viva até a animação terminar.
 */
const PainelDaTroca = forwardRef<HTMLDivElement, PainelProps>(function PainelDaTroca(
  { children, animarEntrada, reduzirMovimento },
  ref,
) {
  const [presente, remover] = usePresence();
  // A entrada mantém o último quadro via animation-fill-mode: both.
  // Evitar setState no fim dos 280 ms impede um render extra no fim do movimento.

  // O fim da animação pode não disparar (ex.: CSS substituído). Não prender um painel oculto.
  useEffect(() => {
    if (presente) return;
    if (reduzirMovimento) {
      remover?.();
      return;
    }
    const seguranca = window.setTimeout(() => remover?.(), 340);
    return () => window.clearTimeout(seguranca);
  }, [presente, reduzirMovimento, remover]);

  const fase = reduzirMovimento
    ? "repouso"
    : !presente
      ? "saida"
      : !animarEntrada
        ? "entrada"
        : "repouso";

  function aoConcluirAnimacao(evento: AnimationEvent<HTMLDivElement>) {
    // Animações de cartões internos não encerram a transição do painel.
    if (evento.target !== evento.currentTarget) return;
    if (!presente) remover?.();
  }

  return (
    <div
      ref={ref}
      className="agenda-troca-visualizacao"
      data-fase={fase}
      aria-hidden={!presente}
      inert={!presente}
      onAnimationEnd={aoConcluirAnimacao}
      onAnimationCancel={aoConcluirAnimacao}
    >
      {children}
    </div>
  );
});

/**
 * Timeline ↔ Cartões: mesma entrada 28 px, saída -20 px, curva suave e 280 ms.
 * Os dois painéis se alternam simultaneamente, sem atrasar a resposta ao toque.
 */
export function TrocaDeVisualizacao({ chave, children }: { chave: string; children: ReactNode }) {
  const reduzirMovimento = Boolean(useReducedMotion());
  const jaMontou = useRef(false);
  useEffect(() => {
    jaMontou.current = true;
  }, []);

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <PainelDaTroca
        key={chave}
        animarEntrada={jaMontou.current}
        reduzirMovimento={reduzirMovimento}
      >
        {children}
      </PainelDaTroca>
    </AnimatePresence>
  );
}

/** A semana recolhe pela altura como no Flow oficial v3.7; manter movimento reduzido. */
export function RecolheNaLista({ visivel, children }: { visivel: boolean; children: ReactNode }) {
  const reduzirMovimento = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {visivel ? (
        <motion.div
          key="semana"
          initial={reduzirMovimento ? false : { height: 0, opacity: 0, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
          exit={
            reduzirMovimento
              ? { height: 0, opacity: 0, overflow: "hidden", transition: { duration: 0 } }
              : { height: 0, opacity: 0, overflow: "hidden" }
          }
          transition={reduzirMovimento ? { duration: 0 } : { duration: 0.28, ease: SUAVE }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
