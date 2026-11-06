import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

const SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * Troca timeline ↔ lista no celular. Antes as duas visualizações ficavam na tela ao mesmo tempo, esmaecendo uma por
 * cima da outra (vídeo do dono, 06/11: a lista aparecia transparente sobre a linha do tempo e havia um quadro vazio).
 * Agora a que sai some na hora e a nova entra com um esmaecer curto, só opacidade e um deslize mínimo — nunca as
 * duas juntas. A chave muda só com a visualização — trocar de dia não passa por aqui (nada pisca).
 */
export function TrocaDeVisualizacao({ chave, children }: { chave: string; children: ReactNode }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={chave}
        initial={{ opacity: 0.35, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 1, transition: { duration: 0 } }}
        transition={{ duration: 0.2, ease: SUAVE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * A faixa da semana recolhe para cima no modo lista (a lista já vai separada por dias). Só transform/opacity (regra de
 * movimento): animar a altura recalculava a posição da linha do tempo inteira a cada quadro e engasgava a troca.
 */
export function RecolheNaLista({ visivel, children }: { visivel: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {visivel ? (
        <motion.div
          key="semana"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, transition: { duration: 0.12 } }}
          transition={{ duration: 0.2, ease: SUAVE }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
