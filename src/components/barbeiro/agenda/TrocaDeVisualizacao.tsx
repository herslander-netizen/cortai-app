import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { CURVA, TEMPO } from "@/lib/movimento-figaro";

/**
 * Timeline ↔ Lista: transição exclusiva e sem deixar exposto o fundo escuro.
 * A anterior recua visível; em seguida a nova sobe já totalmente opaca, nos dois sentidos.
 * A chave depende apenas do modo de visualização — mudar de dia não remonta a Timeline.
 */
export function TrocaDeVisualizacao({ chave, children }: { chave: string; children: ReactNode }) {
  const reduzirMovimento = useReducedMotion();
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={chave}
        initial={reduzirMovimento ? false : { opacity: 1, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={
          reduzirMovimento
            ? { opacity: 1, y: 0, transition: { duration: 0 } }
            : {
                opacity: 1,
                y: -8,
                transition: { duration: TEMPO.botaoSai, ease: CURVA.rapidaParaLinear },
              }
        }
        transition={
          reduzirMovimento
            ? { duration: 0 }
            : { duration: TEMPO.conteudoEntra, ease: CURVA.linearParaLenta }
        }
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Semana ↔ Lista: o seletor da semana acompanha o mesmo sentido da troca de conteúdo,
 * sem animação de altura (que reprocessava a grade e causava engasgos na Timeline).
 * O calendário mensal conserva sua mola e sua mecânica próprias.
 */
export function RecolheNaLista({ visivel, children }: { visivel: boolean; children: ReactNode }) {
  const reduzirMovimento = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {visivel ? (
        <motion.div
          key="semana"
          initial={reduzirMovimento ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={
            reduzirMovimento
              ? { opacity: 1, y: 0, transition: { duration: 0 } }
              : {
                  opacity: 0,
                  y: -8,
                  transition: { duration: TEMPO.botaoSai, ease: CURVA.rapidaParaLinear },
                }
          }
          transition={
            reduzirMovimento
              ? { duration: 0 }
              : { duration: TEMPO.conteudoEntra, ease: CURVA.linearParaLenta }
          }
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
