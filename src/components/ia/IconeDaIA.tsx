import { Sparkles } from "lucide-react";

import type { Segmento } from "@/lib/segmentos";

/**
 * Ícone da Flow IA: o ícone de IA padrão (faíscas), igual em todos os segmentos e tamanhos.
 * `segmento` continua aceito para não mexer nos chamadores, mas não muda mais o desenho.
 */
export function IconeDaIA({
  size = 24,
  className,
}: {
  segmento?: Segmento | undefined;
  size?: number;
  className?: string | undefined;
}) {
  return (
    <Sparkles
      size={size}
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
      {...(className ? { className } : {})}
    />
  );
}
