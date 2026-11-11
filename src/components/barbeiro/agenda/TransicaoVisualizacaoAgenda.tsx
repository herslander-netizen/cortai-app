import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { transicaoBase } from "@/lib/motion";

type Visualizacao = "lista" | "timeline" | "semana";

/**
 * Exibe uma visualização por vez. O painel antigo sai da árvore no mesmo commit
 * em que o novo entra; não há crossfade de duas árvores pesadas, que deixava
 * os cartões fantasmas visíveis sobre a Timeline durante a troca no celular.
 *
 * Só o conteúdo do painel é animado; cabeçalho, semana, Agora e FAB permanecem.
 */
export function TransicaoVisualizacaoAgenda({
  visualizacao,
  children,
}: {
  visualizacao: Visualizacao;
  children: ReactNode;
}) {
  const reduzirMovimento = useMenosMovimento();
  const montado = useRef(false);

  useEffect(() => {
    montado.current = true;
  }, []);

  return (
    <motion.div
      key={visualizacao}
      data-visualizacao={visualizacao}
      className="col-start-1 row-start-1 min-w-0"
      initial={
        reduzirMovimento || !montado.current
          ? false
          : { opacity: 0.98, x: 8 }
      }
      animate={{ opacity: 1, x: 0 }}
      transition={reduzirMovimento ? { duration: 0 } : transicaoBase}
    >
      {children}
    </motion.div>
  );
}
