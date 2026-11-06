import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Ondas da identidade Flow (azul, lilás e rosa) para a página pública (dono, 06/11/2026: "senti falta das ondas se
 * movimentando… aproveitar o tema e os elementos da marca"). `DivisorDeOndas` fica no topo de uma seção e a "puxa" para
 * cima com a cor do próprio fundo; `LinhasDeOnda` são fios finos de fundo. Só transform; paradas com "reduzir movimento".
 * A curva é contínua nas emendas (sem bico) e anda exatamente um período, então o laço não dá salto.
 */
const PERIODO = "M0 34 C 90 6, 270 6, 360 34 S 630 62, 720 34 S 990 6, 1080 34 S 1350 62, 1440 34";
const CORTE = " V70 H0 Z";

function Gradiente({ id, opacidade = 1 }: { id: string; opacidade?: number }) {
  return (
    <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="var(--entrada-ciano)" stopOpacity={opacidade} />
      <stop offset="50%" stopColor="var(--entrada-lilas)" stopOpacity={opacidade} />
      <stop offset="100%" stopColor="var(--entrada-rosa)" stopOpacity={opacidade} />
    </linearGradient>
  );
}

function Camada({
  duracao,
  sentido = 1,
  children,
}: {
  duracao: number;
  sentido?: 1 | -1;
  children: React.ReactNode;
}) {
  const reduzir = useReducedMotion();
  return (
    <motion.svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1440 70"
      preserveAspectRatio="none"
      className="absolute bottom-0 left-0 block h-full w-[200%] max-w-none"
      animate={reduzir ? { x: 0 } : { x: sentido === 1 ? ["0%", "-50%"] : ["-50%", "0%"] }}
      transition={{ duration: duracao, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.svg>
  );
}

export function DivisorDeOndas() {
  const id = useId().replace(/:/g, "");
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 -translate-y-[calc(100%-1px)] overflow-hidden sm:h-16"
    >
      <Camada duracao={16} sentido={-1}>
        <defs>
          <Gradiente id={`${id}-f`} opacidade={0.35} />
        </defs>
        <path d={PERIODO + CORTE} fill={`url(#${id}-f)`} transform="translate(0 -6)" />
      </Camada>
      <Camada duracao={11}>
        <defs>
          <Gradiente id={`${id}-l`} />
        </defs>
        <path d={PERIODO + CORTE} fill="var(--fundo)" />
        <path
          d={PERIODO}
          fill="none"
          stroke={`url(#${id}-l)`}
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </Camada>
    </div>
  );
}

/** Fios de onda de fundo, bem suaves, para dar vida às seções sem competir com o texto. */
export function LinhasDeOnda({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {[
        { topo: "18%", d: 22, s: 1 as const, o: 0.5 },
        { topo: "46%", d: 30, s: -1 as const, o: 0.35 },
        { topo: "74%", d: 26, s: 1 as const, o: 0.45 },
      ].map((l) => (
        <div key={l.topo} className="absolute inset-x-0 h-16" style={{ top: l.topo, opacity: l.o }}>
          <Camada duracao={l.d} sentido={l.s}>
            <defs>
              <Gradiente id={`${id}-${l.topo}`} />
            </defs>
            <path
              d={PERIODO}
              fill="none"
              stroke={`url(#${id}-${l.topo})`}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </Camada>
        </div>
      ))}
    </div>
  );
}
