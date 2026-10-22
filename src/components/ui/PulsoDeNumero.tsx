import { useEffect, type ReactNode } from "react";
import { useAnimate } from "framer-motion";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { CURVA, ESCALA, TEMPO } from "@/lib/movimento-figaro";

const duracaoDaEscala = TEMPO.pulsoSobe + TEMPO.pulsoAssenta;

/**
 * Pulso de estatística do Figaro (`FigarooStatPulseKt`, spec 6 §2): ao aparecer, a escala vai de
 * 0,85 a 1,05 em 140 ms e assenta em 1 em 100 ms; a opacidade vai de 0 a 1 em 240 ms. Trocar
 * `chave` repete o pulso sem remontar o conteúdo (o `Odometro` de dentro continua animando).
 */
export function PulsoDeNumero({
  children,
  chave,
  className,
}: {
  children: ReactNode;
  chave?: string | number;
  className?: string;
}) {
  const [escopo, animar] = useAnimate<HTMLSpanElement>();
  const menosMovimento = useMenosMovimento();

  useEffect(() => {
    if (!escopo.current || menosMovimento) return;
    const escala = animar(
      escopo.current,
      { scale: [ESCALA.pulsoInicio, ESCALA.pulsoPico, 1] },
      {
        duration: duracaoDaEscala,
        times: [0, TEMPO.pulsoSobe / duracaoDaEscala, 1],
        ease: [CURVA.rapidaParaLenta, CURVA.rapidaParaLenta],
      },
    );
    const opacidade = animar(
      escopo.current,
      { opacity: [0, 1] },
      { duration: TEMPO.pulsoAparece, ease: CURVA.rapidaParaLenta },
    );
    return () => {
      escala.stop();
      opacidade.stop();
    };
  }, [chave, animar, escopo, menosMovimento]);

  return (
    <span ref={escopo} className={`inline-block ${className ?? ""}`}>
      {children}
    </span>
  );
}
