import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

const SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * Troca timeline ↔ lista no celular, como no vídeo do dono: a visualização que sai sobe
 * esmaecendo enquanto a nova entra subindo no lugar (as duas ao mesmo tempo). A chave muda só
 * com a visualização — trocar de dia não passa por aqui (nada pisca).
 */
export function TrocaDeVisualizacao({ chave, children }: { chave: string; children: ReactNode }) {
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={chave}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.28, ease: SUAVE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** A faixa da semana recolhe para cima no modo lista (a lista já vai separada por dias). */
export function RecolheNaLista({ visivel, children }: { visivel: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {visivel ? (
        <motion.div
          key="semana"
          initial={{ height: 0, opacity: 0, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
          exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          transition={{ duration: 0.28, ease: SUAVE }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
