import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

import { useMenosMovimento } from "@/hooks/useMovimento";

const SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * Timeline ↔ cartões: ambas as direções usam o mesmo deslocamento curto.
 * A nova visão já entra praticamente opaca e a anterior permanece visível por trás
 * durante a sobreposição. Assim, a cor de fundo nunca aparece como uma tela vazia.
 * popLayout mantém apenas a visão ativa no fluxo da página, sem salto de altura.
 */
export function TrocaDeVisualizacao({ chave, children }: { chave: string; children: ReactNode }) {
  const menosMovimento = useMenosMovimento();
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={chave}
        data-visualizacao={chave}
        initial={menosMovimento ? false : { opacity: 0.96, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={menosMovimento ? { opacity: 1, y: 0 } : { opacity: 0.96, y: -12 }}
        transition={{ duration: menosMovimento ? 0 : 0.22, ease: SUAVE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** A semana acompanha o deslocamento da visão sem apagar seu conteúdo no caminho. */
export function RecolheNaLista({ visivel, children }: { visivel: boolean; children: ReactNode }) {
  const menosMovimento = useMenosMovimento();
  return (
    <AnimatePresence initial={false}>
      {visivel ? (
        <motion.div
          key="semana"
          initial={menosMovimento ? false : { height: 0, opacity: 0.96, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
          exit={{ height: 0, opacity: 0.96, overflow: "hidden" }}
          transition={{ duration: menosMovimento ? 0 : 0.22, ease: SUAVE }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
