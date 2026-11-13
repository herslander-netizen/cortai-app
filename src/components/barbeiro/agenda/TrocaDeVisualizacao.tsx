import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * Timeline ↔ Cartões: paridade com a versão oficial v3.7 (commit 6267ad49).
 * A saída e a entrada ocorrem simultaneamente, sem espera entre os painéis.
 * Redução de movimento preservada, sem alterar as regras da Agenda.
 */
export function TrocaDeVisualizacao({ chave, children }: { chave: string; children: ReactNode }) {
  const reduzirMovimento = useReducedMotion();
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={chave}
        initial={reduzirMovimento ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={
          reduzirMovimento
            ? { opacity: 1, y: 0, transition: { duration: 0 } }
            : { opacity: 0, y: -20 }
        }
        transition={reduzirMovimento ? { duration: 0 } : { duration: 0.28, ease: SUAVE }}
        // A Lista e a Timeline saem/entram ao mesmo tempo (paridade v3.7) e a Timeline pinta
        // listras repetidas (fora de expediente) e dezenas de cartões: sem promover a própria
        // camada, o navegador repinta esse conteúdo a cada quadro da transição em vez de só
        // compor um bitmap já pronto — é isso que trava a troca em aparelhos mais fracos
        // enquanto o resto da Agenda (que não reempilha duas visões grandes) flui normal.
        style={reduzirMovimento ? {} : { willChange: "transform, opacity" }}
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
