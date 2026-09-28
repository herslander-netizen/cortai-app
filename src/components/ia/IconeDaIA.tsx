import { BigodeCortai } from "./BigodeCortai";

import { SEGMENTOS_CONFIG, segmentoValido, type Segmento } from "@/lib/segmentos";

export function IconeDaIA({
  segmento = "barbearia",
  size = 24,
  className,
}: {
  segmento?: Segmento;
  size?: number;
  className?: string;
}) {
  if (SEGMENTOS_CONFIG[segmentoValido(segmento)].iconeIA === "bigode") {
    return <BigodeCortai size={size} className={className} />;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 3.25c2.95 0 5.35 2.4 5.35 5.35S14.95 13.95 12 13.95 6.65 11.55 6.65 8.6 9.05 3.25 12 3.25Z" />
    </svg>
  );
}