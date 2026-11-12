import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * Na agenda do celular, a mudança Timeline ↔ Cartões segue a referência do
 * Catálogo: os PAINÉIS deslizam na horizontal, simultaneamente, enquanto os
 * controles fixos permanecem fora desta área. A animação não atua no botão.
 * Desktop mantém a transição vertical existente.
 */
export function TrocaDeVisualizacao({
  chave,
  celular = false,
  children,
}: {
  chave: string;
  celular?: boolean;
  children: ReactNode;
}) {
  const reduzirMovimento = useReducedMotion();
  // Entrar nos Cartões: da direita. Voltar à Timeline: da esquerda.
  // O painel que sai anda no sentido oposto ao que vai entrar.
  const deslocamento = chave === "lista" ? "100%" : "-100%";
  const inicial = celular
    ? { x: deslocamento }
    : { opacity: 0, y: 28 };
  const final = celular
    ? { x: 0 }
    : { opacity: 1, y: 0 };
  const saida = celular
    ? { x: deslocamento }
    : { opacity: 0, y: -20 };
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={chave}
        initial={reduzirMovimento ? false : inicial}
        animate={final}
        exit={reduzirMovimento ? { ...final, transition: { duration: 0 } } : saida}
        transition={reduzirMovimento ? { duration: 0 } : { duration: 0.28, ease: SUAVE }}
      >
        {children}
      </motion.div>
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
