import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Ondas leves da identidade Flow. O movimento é decorativo e para com a preferência do aparelho. */
export function OndasDaEntrada() {
  const id = useId().replace(/:/g, "");
  const reduzirMovimento = useReducedMotion();
  const transicaoSuperior = { duration: 14, ease: "easeInOut" as const, repeat: Infinity };
  const transicaoInferior = { duration: 17, ease: "easeInOut" as const, repeat: Infinity };

  return (
    <motion.svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 390 844"
      preserveAspectRatio="none"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    >
      <defs>
        <linearGradient id={`${id}-superior`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--figaro-secondary)" stopOpacity="0.6" />
          <stop offset="52%" stopColor="var(--figaro-primary)" stopOpacity="0.42" />
          <stop offset="100%" stopColor="var(--flow-rosa, #f48fb1)" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`${id}-inferior`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--figaro-primary)" stopOpacity="0.32" />
          <stop offset="55%" stopColor="var(--figaro-secondary)" stopOpacity="0.42" />
          <stop offset="100%" stopColor="var(--flow-rosa, #f48fb1)" stopOpacity="0.34" />
        </linearGradient>
      </defs>

      <motion.g
        animate={reduzirMovimento ? undefined : { x: [0, 10, 0], y: [0, -5, 0] }}
        transition={reduzirMovimento ? undefined : transicaoSuperior}
      >
        <path
          d="M-36 112 C35 52 93 133 169 119 C257 104 302 34 430 -18 L430 119 C334 161 282 222 183 205 C96 190 34 133 -36 228 Z"
          fill={`url(#${id}-superior)`}
          opacity="0.55"
        />
        <path
          d="M-30 178 C44 97 113 158 198 139 C284 119 333 53 426 27"
          fill="none"
          stroke={`url(#${id}-superior)`}
          strokeWidth="1.5"
          opacity="0.82"
        />
      </motion.g>

      <motion.g
        animate={reduzirMovimento ? undefined : { x: [0, -8, 0], y: [0, 5, 0] }}
        transition={reduzirMovimento ? undefined : transicaoInferior}
      >
        <path
          d="M-34 700 C48 635 102 711 182 696 C275 678 324 604 428 628 L428 866 L-34 866 Z"
          fill={`url(#${id}-inferior)`}
          opacity="0.58"
        />
        <path
          d="M-28 745 C64 671 119 774 211 748 C303 722 346 658 427 677"
          fill="none"
          stroke={`url(#${id}-inferior)`}
          strokeWidth="1.6"
          opacity="0.9"
        />
      </motion.g>
    </motion.svg>
  );
}
