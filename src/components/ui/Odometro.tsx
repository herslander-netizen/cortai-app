import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MOLA } from "@/lib/movimento-figaro";
import { sentidosDoOdometro } from "@/lib/odometro";

/**
 * Número que troca dígito a dígito (Figaro, spec 6 §2): o dígito novo desliza a própria altura com a
 * mola `padraoEspacial` e esmaece com a `rapidaEfeito`. A primeira exibição não anima.
 */
export function Odometro({ texto, className }: { texto: string; className?: string }) {
  const anterior = useRef(texto);
  const sentidos = useRef<number[]>([]);
  if (anterior.current !== texto) {
    sentidos.current = sentidosDoOdometro(anterior.current, texto);
    anterior.current = texto;
  }
  const caracteres = [...texto];

  return (
    <span className={`inline-flex tabular-nums ${className ?? ""}`} aria-label={texto} role="text">
      {caracteres.map((c, i) => {
        const coluna = caracteres.length - i;
        const sentido = sentidos.current[i] || 1;
        return (
          <span key={`coluna-${coluna}`} aria-hidden className="inline-grid overflow-hidden">
            <AnimatePresence initial={false} custom={sentido}>
              <motion.span
                key={c}
                // Antigo e novo ocupam a mesma célula, sem alargar a coluna durante a troca.
                className="inline-block [grid-area:1/1]"
                custom={sentido}
                variants={{
                  entra: (s: number) => ({ y: `${s * 100}%`, opacity: 0 }),
                  fica: {
                    y: "0%",
                    opacity: 1,
                    transition: { y: MOLA.padraoEspacial, opacity: MOLA.rapidaEfeito },
                  },
                  sai: (s: number) => ({
                    y: `${-s * 100}%`,
                    opacity: 0,
                    transition: { y: MOLA.padraoEspacial, opacity: MOLA.rapidaEfeito },
                  }),
                }}
                initial="entra"
                animate="fica"
                exit="sai"
              >
                {c === " " ? " " : c}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}
