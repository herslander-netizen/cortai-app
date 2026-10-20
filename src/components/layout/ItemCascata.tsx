import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { cascata } from "@/lib/motion";
import { useMenosMovimento } from "@/hooks/useMovimento";

/**
 * Entrada em cascata para itens de lista (40 ms entre itens, no máximo 6).
 * Com "menos movimento" ligado, o item aparece direto.
 */
export function ItemCascata({
  indice,
  className,
  children,
}: {
  indice: number;
  className?: string;
  children: ReactNode;
}) {
  const menos = useMenosMovimento();
  if (menos) return <li className={className}>{children}</li>;
  const a = cascata(indice);
  return (
    <motion.li
      className={className}
      initial={a.initial}
      animate={a.animate}
      transition={a.transition}
    >
      {children}
    </motion.li>
  );
}
