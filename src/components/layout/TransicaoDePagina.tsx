import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";

import { transicaoBase } from "@/lib/motion";
import { useMenosMovimento } from "@/hooks/useMovimento";

/** Troca de página: esmaece e sobe levemente. */
export function TransicaoDePagina({ children }: { children: ReactNode }) {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const menosMovimento = useMenosMovimento();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={caminho}
        initial={menosMovimento ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={menosMovimento ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={transicaoBase}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
