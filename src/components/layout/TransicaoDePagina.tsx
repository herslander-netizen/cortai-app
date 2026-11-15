import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";

import { transicaoBase } from "@/lib/motion";
import { useMenosMovimento } from "@/hooks/useMovimento";

/**
 * Entrada suave da página (esmaece e sobe levemente).
 * Sem `AnimatePresence`: a saída mantinha a tela antiga montada junto da nova,
 * renderizando tudo em dobro. `nivel` define quanto do caminho forma a chave:
 * no raiz usa só a área (`/barbeiro`), assim trocar de tela dentro da área não
 * remonta cabeçalho, menu, tempo real e consultas; o miolo usa o caminho todo.
 */
export function TransicaoDePagina({ children, nivel }: { children: ReactNode; nivel?: number }) {
  const chave = useRouterState({
    select: (s) =>
      nivel
        ? s.location.pathname
            .split("/")
            .slice(0, nivel + 1)
            .join("/")
        : s.location.pathname,
  });
  const menosMovimento = useMenosMovimento();

  return (
    <motion.div
      key={chave}
      initial={menosMovimento ? { opacity: 0 } : { opacity: 0, y: 3 }}
      animate={menosMovimento ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={transicaoBase}
    >
      {children}
    </motion.div>
  );
}
