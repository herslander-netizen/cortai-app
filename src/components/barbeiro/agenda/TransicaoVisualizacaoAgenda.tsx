import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import type { ReactNode } from "react";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { transicaoBase } from "@/lib/motion";

type Visualizacao = "lista" | "timeline" | "semana";

function VisaoDaAgenda({
  visualizacao,
  reduzirMovimento,
  children,
}: {
  visualizacao: Visualizacao;
  reduzirMovimento: boolean;
  children: ReactNode;
}) {
  const presente = useIsPresent();

  return (
    <motion.div
      data-visualizacao={visualizacao}
      className="col-start-1 row-start-1 min-w-0"
      aria-hidden={!presente || undefined}
      inert={!presente}
      initial={reduzirMovimento ? false : { opacity: 0.92, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduzirMovimento ? { opacity: 1 } : { opacity: 0, x: -12 }}
      transition={reduzirMovimento ? { duration: 0 } : transicaoBase}
    >
      {children}
    </motion.div>
  );
}

/** Mantém a visão anterior atrás da nova durante a troca, sem expor o fundo vazio. */
export function TransicaoVisualizacaoAgenda({
  visualizacao,
  children,
}: {
  visualizacao: Visualizacao;
  children: ReactNode;
}) {
  const reduzirMovimento = useMenosMovimento();

  return (
    <AnimatePresence initial={false} mode="sync">
      <VisaoDaAgenda
        key={visualizacao}
        visualizacao={visualizacao}
        reduzirMovimento={reduzirMovimento}
      >
        {children}
      </VisaoDaAgenda>
    </AnimatePresence>
  );
}
