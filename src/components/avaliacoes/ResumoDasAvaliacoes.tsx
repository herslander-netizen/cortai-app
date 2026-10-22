import { motion } from "framer-motion";
import { Star, StarHalf } from "lucide-react";

import { PulsoDeNumero } from "@/components/ui/PulsoDeNumero";
import { useContagem } from "@/hooks/useMovimento";
import { MOLA } from "@/lib/movimento-figaro";
import {
  distribuicaoDasNotas,
  estrelasDaMedia,
  mediaFormatada,
  rotuloDaMedia,
  tomDaNota,
} from "@/lib/resumo-avaliacoes";

/**
 * Tempo da contagem da média e atraso entre as barras. O código do Figaro não anima este cartão; os
 * valores vêm do vídeo `landing_peek_reviews` do APK (a nota conta em cerca de 1 s, depois aparece o
 * rótulo e as barras crescem uma após a outra). Spec 6 §5.
 */
const CONTAGEM_MS = 900;
const ATRASO_ENTRE_BARRAS = 0.06;

/**
 * Resumo das avaliações no padrão do Figaro (`RatingsSummaryCard`): à esquerda a média, as estrelas
 * e o rótulo; à direita as barras de 5 a 1 (6 px), em dois blocos lado a lado (1 : 1,2).
 */
export function ResumoDasAvaliacoes({ media, notas }: { media: number | null; notas: number[] }) {
  const valor = media ?? 0;
  const atual = useContagem(valor, CONTAGEM_MS, true);
  const terminou = Math.abs(atual - valor) < 0.001;
  const linhas = distribuicaoDasNotas(notas);
  const rotulo = rotuloDaMedia(media);

  return (
    <section
      className="grid grid-cols-[1fr_1.2fr] gap-0.5"
      aria-label={
        media === null ? "Ainda sem avaliações" : `Média ${mediaFormatada(media)} de 5, ${rotulo}`
      }
    >
      <div className="flex flex-col items-center justify-center rounded-l-[20px] rounded-r-md bg-ink2 px-3 py-4 text-center">
        <p className="text-[36px] font-bold leading-none tabular-nums text-paper" aria-hidden>
          {media === null ? "—" : mediaFormatada(atual)}
        </p>
        <div className={`mt-2.5 flex gap-0.5 ${tomDaNota(atual).texto}`} aria-hidden>
          {estrelasDaMedia(atual).map((e, i) =>
            e === "meia" ? (
              <span key={i} className="relative inline-flex">
                <Star size={20} fill="none" className="text-nota-contorno" />
                <StarHalf size={20} fill="currentColor" className="absolute inset-0" />
              </span>
            ) : (
              <Star
                key={i}
                size={20}
                fill={e === "cheia" ? "currentColor" : "none"}
                className={e === "vazia" ? "text-nota-contorno" : ""}
              />
            ),
          )}
        </div>
        <p className="mt-2 min-h-5 text-sm font-semibold text-nota-rotulo" aria-hidden>
          {media !== null && terminou ? <PulsoDeNumero>{rotulo}</PulsoDeNumero> : null}
        </p>
      </div>
      <ul
        className="flex flex-col justify-center gap-2 rounded-l-md rounded-r-[20px] bg-ink2 px-4 py-4"
        aria-hidden
      >
        {linhas.map((l, i) => (
          <li key={l.nota} className="flex items-center gap-2.5">
            <span className="w-2.5 text-xs tabular-nums text-mute">{l.nota}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-nota-trilho">
              <motion.span
                className={`block h-full origin-left rounded-full ${tomDaNota(l.nota).fundo}`}
                style={{ width: `${l.percentual}%` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: terminou ? 1 : 0 }}
                transition={{ ...MOLA.tamanho, delay: terminou ? i * ATRASO_ENTRE_BARRAS : 0 }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
