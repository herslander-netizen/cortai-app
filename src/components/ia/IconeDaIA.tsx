import { Sparkles } from "lucide-react";

import { BigodeCortai } from "./BigodeCortai";

import { SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";

/** Ícone da CortAI: bigode na barbearia, acento do "í" nos demais segmentos. */
export function IconeDaIA({
  segmento = "barbearia",
  size = 24,
  className,
}: {
  segmento?: Segmento | undefined;
  size?: number;
  className?: string | undefined;
}) {
  if (SEGMENTOS_CONFIG[segmentoValido(segmento)].iconeIA === "bigode") {
    return <BigodeCortai size={size} {...(className ? { className } : {})} />;
  }
  // Abaixo de 15px o acento perde a leitura: usa o Sparkles.
  if (size < 15) return <Sparkles size={size} strokeWidth={1.75} aria-hidden="true" {...(className ? { className } : {})} />;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      {/* Acento do "í": retângulo arredondado inclinado ~-30°, centralizado, ~60% da caixa. */}
      <rect x="8.4" y="4.8" width="7.2" height="14.4" rx="3.6" transform="rotate(30 12 12)" />
    </svg>
  );
}
