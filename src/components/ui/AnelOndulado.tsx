import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

import { useMenosMovimento } from "@/hooks/useMovimento";
import { caminhoOndulado } from "@/lib/anel-ondulado";
import { CONCLUSAO, CURVA } from "@/lib/movimento-figaro";

const CENTRO = 50;
const RAIO = 38;
const ONDAS = 9;
const AMPLITUDE = 3;
const ARCO_CARREGANDO = 72;
const VOLTA_MS = 1400;

/**
 * Indicador do Figaro na espera do onboarding ("Configurando sua página…"): anel ondulado com um arco
 * que gira. Quando `completo` vira verdadeiro o arco fecha, as ondas se desfazem até o círculo (520 ms)
 * e o visto é desenhado dentro dele.
 */
export function AnelOndulado({ completo, tamanho }: { completo: boolean; tamanho: number }) {
  const menosMovimento = useMenosMovimento();
  const amplitude = useMotionValue(AMPLITUDE);
  const arco = useMotionValue(ARCO_CARREGANDO);
  const giro = useMotionValue(0);
  const giroLoop = useRef<{ stop: () => void } | null>(null);

  const caminho = useTransform(amplitude, (a) => caminhoOndulado(CENTRO, RAIO, a, ONDAS));
  const tracejado = useTransform(arco, (a) => `${a} ${100 - a}`);

  useEffect(() => {
    if (completo || menosMovimento) return;
    giroLoop.current = animate(giro, giro.get() + 360, {
      duration: VOLTA_MS / 1000,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });
    return () => giroLoop.current?.stop();
  }, [completo, menosMovimento, giro]);

  useEffect(() => {
    if (!completo) return;
    giroLoop.current?.stop();
    const duracao = menosMovimento ? 0.15 : CONCLUSAO.heroSegundos;
    const opcoes = { duration: duracao, ease: CURVA.rapidaParaLenta } as const;
    const controles = [
      animate(amplitude, 0, opcoes),
      animate(arco, 100, opcoes),
      animate(giro, Math.ceil(giro.get() / 360) * 360, opcoes),
    ];
    return () => controles.forEach((c) => c.stop());
  }, [completo, menosMovimento, amplitude, arco, giro]);

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      fill="none"
      role={completo ? "img" : "progressbar"}
      aria-label={completo ? "Concluído" : "Carregando"}
    >
      <motion.g style={{ rotate: giro, transformOrigin: "50% 50%", transformBox: "fill-box" }}>
        <motion.path
          d={caminho}
          stroke="color-mix(in oklab, var(--primary) 16%, transparent)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <motion.path
          d={caminho}
          pathLength={100}
          stroke="var(--primary)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: tracejado }}
        />
      </motion.g>
      <motion.path
        d="M33 52l13 13 22-26"
        stroke="var(--primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={completo ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{
          duration: menosMovimento ? 0.15 : 0.28,
          delay: completo && !menosMovimento ? CONCLUSAO.heroSegundos * 0.6 : 0,
          ease: CURVA.rapidaParaLenta,
        }}
      />
    </svg>
  );
}
