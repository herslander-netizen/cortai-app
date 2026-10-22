import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LayoutId, TemaId } from "@/lib/pagina-config";
import { TEMAS } from "@/lib/pagina-config";
import { MiniaturaDoTema } from "./MiniaturaDoTema";

export const DESCRICOES_LAYOUT: Record<LayoutId, string> = {
  cinematografico: "Capa marcante e apresentação com bastante presença.",
  "logo-central": "Marca e conteúdo alinhados ao centro.",
  minimalista: "Visual discreto, com foco no nome e nas informações.",
  "foto-destaque": "Fotografia em evidência na abertura da página.",
  editorial: "Composição editorial, com largura e títulos mais contidos.",
  "figaro-site-completo": "Layout completo com as seções organizadas em uma rolagem única.",
  "figaro-agendamento": "Layout focado em levar o cliente rapidamente à escolha do serviço e do horário.",
};

export function MiniaturaLayout({ layout, cover = false }: { layout: LayoutId; cover?: boolean }) {
  return (
    <div
      className={cover
        ? "flex h-full w-full flex-col overflow-hidden rounded-none border-0 bg-background p-3 sm:p-4"
        : "flex h-28 w-full flex-col overflow-hidden rounded-md border border-line bg-background p-2"}
      aria-hidden
    >
      {layout === "logo-central" ? (
        <>
          <div className="h-7 rounded-sm bg-ink3 opacity-80" />
          <div className="mx-auto mt-2 size-5 rounded-full border-2 border-gold" />
          <div className="mx-auto mt-1 h-1.5 w-2/3 rounded-full bg-mute opacity-80" />
          <div className="mx-auto mt-1 h-1 w-1/3 rounded-full bg-mute opacity-40" />
          <div className="mx-auto mt-auto h-3 w-1/2 rounded-full bg-gold" />
        </>
      ) : layout === "minimalista" ? (
        <>
          <div className="h-1.5 w-1/3 rounded-full bg-mute opacity-40" />
          <div className="mt-2 h-2 w-3/4 rounded-full bg-ink3" />
          <div className="mt-1 h-1.5 w-1/2 rounded-full bg-mute opacity-50" />
          <div className="mt-auto flex items-center gap-1">
            <div className="h-5 flex-1 rounded-sm border border-line" />
            <div className="h-5 w-8 rounded-sm bg-gold" />
          </div>
        </>
      ) : layout === "foto-destaque" ? (
        <>
          <div className="flex flex-1 items-end rounded-sm bg-ink3 p-2">
            <div className="h-2 w-2/3 rounded-full bg-paper opacity-80" />
          </div>
          <div className="mt-1 flex gap-1">
            <div className="h-1.5 w-1/2 rounded-full bg-mute opacity-60" />
            <div className="h-1.5 flex-1 rounded-full bg-mute opacity-30" />
          </div>
        </>
      ) : layout === "editorial" ? (
        <>
          <div className="flex items-center justify-between">
            <div className="h-1.5 w-1/4 rounded-full bg-mute opacity-40" />
            <div className="size-3 rounded-full bg-gold" />
          </div>
          <div className="mt-2 h-2 w-4/5 rounded-full bg-ink3" />
          <div className="mt-1 h-1.5 w-2/3 rounded-full bg-mute opacity-50" />
          <div className="mt-auto grid grid-cols-3 gap-1">
            <div className="h-7 rounded-sm bg-ink3" />
            <div className="h-7 rounded-sm bg-mute opacity-30" />
            <div className="h-7 rounded-sm bg-gold opacity-70" />
          </div>
        </>
      ) : layout === "figaro-site-completo" ? (
        <>
          <div className="flex h-8 flex-col justify-end rounded-sm bg-ink3 p-2">
            <div className="h-1.5 w-2/3 rounded-full bg-paper opacity-80" />
          </div>
          <div className="mt-1 grid flex-1 grid-cols-2 gap-1">
            <div className="rounded-sm bg-mute opacity-25" />
            <div className="rounded-sm bg-ink3 opacity-75" />
            <div className="rounded-sm bg-ink3 opacity-55" />
            <div className="rounded-sm bg-gold opacity-70" />
          </div>
        </>
      ) : layout === "figaro-agendamento" ? (
        <>
          <div className="h-2 w-3/4 rounded-full bg-ink3" />
          <div className="mt-1 h-1.5 w-1/2 rounded-full bg-mute opacity-60" />
          <div className="mt-2 flex flex-1 flex-col gap-1">
            <div className="flex-1 rounded-sm border border-line bg-ink3/70" />
            <div className="flex-1 rounded-sm border border-line bg-ink3/40" />
          </div>
          <div className="mt-1 h-4 w-full rounded-full bg-gold" />
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-col justify-end rounded-sm bg-ink3 p-2">
            <div className="h-1.5 w-1/3 rounded-full bg-paper opacity-50" />
            <div className="mt-1 h-2.5 w-3/4 rounded-full bg-paper opacity-90" />
            <div className="mt-2 h-4 w-1/2 rounded-full bg-gold" />
          </div>
          <div className="mt-1 h-1.5 w-1/2 rounded-full bg-mute opacity-40" />
        </>
      )}
    </div>
  );
}

export function IndicadorSelecionado({ tom = "layout" }: { tom?: "layout" | "tema" }) {
  const reduzirMovimento = useReducedMotion();
  return (
    <motion.span
      initial={reduzirMovimento ? false : { opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduzirMovimento ? { duration: 0 } : { type: "spring", stiffness: 1500, damping: 58 }}
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-ink ${tom === "tema" ? "bg-rosa" : "bg-gold"}`}
      aria-hidden
    >
      <Check size={15} />
    </motion.span>
  );
}

export function TemaCartao({
  tema,
  selecionado,
  escolher,
}: {
  tema: TemaId;
  selecionado: boolean;
  escolher: () => void;
}) {
  const definicao = TEMAS[tema];
  const referenciaFigaro = tema.startsWith("figaro-");
  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={selecionado}
      onClick={escolher}
      className={`relative h-auto min-h-[218px] w-[min(78vw,286px)] shrink-0 snap-start flex-col items-stretch whitespace-normal rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${selecionado ? "border-2 border-rosa bg-rosa/10" : "border-line bg-ink"}`}
    >
      <MiniaturaDoTema cores={definicao.cores} />
      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-paper">
        {definicao.nome}
        {selecionado ? <IndicadorSelecionado tom="tema" /> : <span className="size-6 shrink-0 rounded-full border border-line2" aria-hidden />}
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-mute">{definicao.descricao}</span>
      <span className="mt-1 block text-[11px] font-medium text-mute">{referenciaFigaro ? "Referência Figaro · paleta adaptada" : "Tema do Cortaí"}</span>
      <span className="mt-auto flex h-2 overflow-hidden rounded-full" aria-hidden>
        {[definicao.cores.principal, definicao.cores.secundaria, definicao.cores.botao, definicao.cores.fundo, definicao.cores.destaque].map((cor, i) => (
          <i key={i} className="flex-1" style={{ backgroundColor: cor }} />
        ))}
      </span>
    </Button>
  );
}
