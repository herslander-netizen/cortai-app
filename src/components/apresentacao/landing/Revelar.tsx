import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { MOLA } from "@/lib/movimento-figaro";

/** Aparece subindo um pouco quando entra na tela (só transform/opacity; parado com "reduzir movimento"). */
export function Revelar({
  children,
  atraso = 0,
  className,
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
}) {
  const reduzir = useReducedMotion();
  if (reduzir) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ ...MOLA.padraoEspacial, delay: atraso }}
    >
      {children}
    </motion.div>
  );
}
