import type { ReactNode } from "react";
import { motion } from "framer-motion";

type Direcao = "topo" | "baixo";

/**
 * Entrada/saída do cromo do modo armado do Figaro.
 * Isolar este movimento impede que a troca de dia seja confundida com uma animação
 * de tela que começa invisível; a Timeline não é remontada nem esmaecida aqui.
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
  const deslocamento = direcao === "topo" ? -18 : 32;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: deslocamento }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: deslocamento }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
