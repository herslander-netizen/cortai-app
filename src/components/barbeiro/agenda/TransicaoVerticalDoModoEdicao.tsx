import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { CURVA, TEMPO } from "@/lib/movimento-figaro";

type Direcao = "topo" | "baixo";

/**
 * Entrada/saída do cromo do modo armado do Figaro (spec 2-agenda §6, passo 2): a barra de cima sobe e a de
 * baixo desce, deslizando a própria altura, com fade, em 300 ms na curva FastOutSlowIn. Isolar este movimento
 * impede que a troca de dia seja confundida com uma animação de tela que começa invisível.
 */
export function TransicaoVerticalDoModoEdicao({
  children,
  direcao,
  className,
}: {
  children: ReactNode;
  direcao: Direcao;
  className?: string;
}) {
  // Topo sobe e base desce, cada um a própria altura (`slideVertically(±altura)`).
  const deslocamento = direcao === "topo" ? "-100%" : "100%";
  return (
    <motion.div
      className={className}
      data-edicao-ui=""
      initial={{ opacity: 0, y: deslocamento }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: deslocamento }}
      transition={{ duration: TEMPO.etapaDeFluxo, ease: CURVA.rapidaParaLenta }}
    >
      {children}
    </motion.div>
  );
}
