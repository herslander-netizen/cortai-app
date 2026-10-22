import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { sentidoDaEtapa, variantesDaEtapa, type CustomDaEtapa } from "@/lib/etapas-animadas";

/** A etapa que está saindo fica inerte: não recebe foco nem toque e não duplica campos. */
function EtapaDaVez({ children }: { children: ReactNode }) {
  const presente = useIsPresent();
  return <div {...(presente ? {} : { inert: true, "aria-hidden": true })}>{children}</div>;
}

/**
 * Conteúdo de um cadastro em etapas, com a troca do Figaro: desliza a largura inteira e esmaece em
 * 220 ms, na direção do passo. Envolva só o miolo de cada etapa; o cabeçalho, o progresso e o botão
 * de ação ficam fora.
 */
export function EtapasAnimadas({ etapa, children }: { etapa: number; children: ReactNode }) {
  const menosMovimento = useMenosMovimento();
  const anterior = useRef(etapa);
  const sentido = useRef(sentidoDaEtapa(etapa, etapa));
  if (anterior.current !== etapa) {
    sentido.current = sentidoDaEtapa(anterior.current, etapa);
    anterior.current = etapa;
  }
  const custom: CustomDaEtapa = { sentido: sentido.current, menosMovimento };

  return (
    <div className="relative" style={{ overflowX: "clip" }}>
      <AnimatePresence mode="popLayout" initial={false} custom={custom}>
        <motion.div
          key={etapa}
          custom={custom}
          variants={variantesDaEtapa}
          initial="entra"
          animate="fica"
          exit="sai"
        >
          <EtapaDaVez>{children}</EtapaDaVez>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
