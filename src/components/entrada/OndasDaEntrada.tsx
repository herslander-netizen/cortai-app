import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Ciclos mais curtos deixam o movimento das ondas mais perceptível sem acelerar demais a composição. */
export const DURACAO_ONDAS_SEGUNDOS = { superior: 7, inferior: 8.5 } as const;

/**
 * Ondas da identidade Flow sobre o fundo branco (dono, 06/11/2026: "tema claro de fundo, ondas se movendo na
 * identidade do Flow"): faixas em azul, lilás e rosa, como nas capas claras da marca. Decorativas; param com a
 * preferência de movimento reduzido.
 */
/** `className` troca o posicionamento (padrão: tela inteira fixa); a página pública usa `absolute` dentro de cada seção. */
export function OndasDaEntrada({
  className = "fixed inset-0 z-0 h-full w-full",
}: {
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const reduzirMovimento = useReducedMotion();
  const transicaoSuperior = {
    duration: DURACAO_ONDAS_SEGUNDOS.superior,
    ease: "easeInOut" as const,
    repeat: Infinity,
  };
  const transicaoInferior = {
    duration: DURACAO_ONDAS_SEGUNDOS.inferior,
    ease: "easeInOut" as const,
    repeat: Infinity,
  };

  return (
    <motion.svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 390 844"
      preserveAspectRatio="none"
      className={`pointer-events-none ${className}`}
    >
      <defs>
        <linearGradient id={`${id}-superior`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--entrada-ciano)" stopOpacity="0.55" />
          <stop offset="50%" stopColor="var(--entrada-lilas)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--entrada-rosa)" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`${id}-inferior`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--entrada-rosa)" stopOpacity="0.38" />
          <stop offset="55%" stopColor="var(--entrada-lilas)" stopOpacity="0.42" />
          <stop offset="100%" stopColor="var(--entrada-ciano)" stopOpacity="0.5" />
        </linearGradient>
        <filter id={`${id}-suave`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <motion.g
        {...(!reduzirMovimento
          ? {
              animate: { x: [0, 14, 0], y: [0, -7, 0], rotate: [0, 1.2, 0] },
              transition: transicaoSuperior,
            }
          : {})}
      >
        <path
          d="M-40 96 C40 30 104 130 182 112 C268 92 308 20 432 -26 L432 132 C334 178 280 236 180 218 C92 202 30 140 -40 236 Z"
          fill={`url(#${id}-superior)`}
          filter={`url(#${id}-suave)`}
          opacity="0.6"
        />
        <path
          d="M-30 176 C44 92 116 160 200 138 C286 116 336 50 428 24"
          fill="none"
          stroke={`url(#${id}-superior)`}
          strokeWidth="2"
          opacity="0.9"
        />
      </motion.g>

      <motion.g
        {...(!reduzirMovimento
          ? {
              animate: { x: [0, -12, 0], y: [0, 7, 0], rotate: [0, -1, 0] },
              transition: transicaoInferior,
            }
          : {})}
      >
        <path
          d="M-36 690 C50 620 106 704 186 688 C280 668 328 594 430 616 L430 870 L-36 870 Z"
          fill={`url(#${id}-inferior)`}
          filter={`url(#${id}-suave)`}
          opacity="0.55"
        />
        <path
          d="M-28 742 C66 664 122 772 214 744 C306 716 348 652 428 670"
          fill="none"
          stroke={`url(#${id}-inferior)`}
          strokeWidth="2"
          opacity="0.9"
        />
      </motion.g>
    </motion.svg>
  );
}
