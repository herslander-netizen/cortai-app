import {
  Brush, CalendarDays, Camera, CheckCheck, Clock3, Cloud, Coffee, Droplets,
  Eye, Flower2, Gem, Hand, Heart, Leaf, Paintbrush, PenTool, Pipette,
  Scissors, Search, Smile, Sparkles, SprayCan, Star, WandSparkles, Wind,
  type LucideIcon,
} from "lucide-react";
import type { Segmento } from "@/lib/segmentos";

/** Ícones originais do catálogo Lucide. Não usa imagens, marcas nem recursos do Figaroo. */
export const ICONES_DO_CHAT_POR_SEGMENTO: Record<Segmento, readonly LucideIcon[]> = {
  barbearia: [Scissors, Brush, Sparkles, Clock3, SprayCan, Star],
  salao: [Brush, Sparkles, SprayCan, Gem, Scissors, Heart],
  cabeleireiro: [Scissors, Brush, Wind, SprayCan, Sparkles, Gem],
  esmalteria: [Hand, Paintbrush, Gem, Sparkles, Pipette, Heart],
  sobrancelha_cilios: [Eye, PenTool, Sparkles, WandSparkles, Gem, Heart],
  estetica: [Flower2, Leaf, Droplets, Heart, WandSparkles, Sparkles],
  outro: [CalendarDays, CheckCheck, Coffee, Cloud, Search, Smile, Camera],
};

const INCLINACOES = [-11, 15, -4, 8, 0, -17, 12, -6] as const;

/** Pattern decorativo sem asset externo, animação ou interceptação de gestos. */
export function PadraoChatSegmento({ segmento }: { segmento: Segmento }) {
  const icones = ICONES_DO_CHAT_POR_SEGMENTO[segmento];
  return (
    <div
      aria-hidden="true"
      data-padrao-segmento={segmento}
      className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-8 place-items-center gap-3 overflow-hidden opacity-[0.10] sm:grid-cols-4 sm:grid-rows-6"
      style={{ color: "var(--chat-content, var(--paper))", maskImage: "linear-gradient(180deg, transparent 0%, black 10%, black 94%, transparent 100%)" }}
    >
      {Array.from({ length: 24 }, (_, indice) => {
        const Icone = icones[(indice * 5 + Math.floor(indice / 4)) % icones.length]!;
        return (
          <span
            key={indice}
            className="flex size-full items-center justify-center"
            style={{ transform: "rotate(" + INCLINACOES[indice % INCLINACOES.length] + "deg)" }}
          >
            <Icone className="size-12 sm:size-16" strokeWidth={1.55} focusable="false" />
          </span>
        );
      })}
    </div>
  );
}
