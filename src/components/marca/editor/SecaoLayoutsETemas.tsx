import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutTemplate } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { LayoutId, PaginaConfig, TemaId } from "@/lib/pagina-config";
import { componenteIds, LAYOUTS, TEMAS, temaIds } from "@/lib/pagina-config";
import { MOLA } from "@/lib/movimento-figaro";
import { DESCRICOES_LAYOUT, IndicadorSelecionado, MiniaturaLayout, TemaCartao } from "./CartoesDeLayoutTema";

const ROTULOS_SECOES: Record<(typeof componenteIds)[number], string> = {
  apresentacao: "Apresentação",
  servicos: "Serviços",
  profissionais: "Equipe",
  galeria: "Galeria",
  avaliacoes: "Avaliações",
  produtos: "Produtos",
  instagram: "Instagram",
  localizacao: "Localização",
  horarios: "Horários",
  whatsapp: "WhatsApp",
  cta_final: "Botão final",
};

export function SecaoLayoutsETemas({
  config,
  setLayout,
  escolherTema,
  onVerExemplo,
}: {
  config: PaginaConfig;
  setLayout: (layout: LayoutId) => void;
  escolherTema: (tema: TemaId) => void;
  onVerExemplo: () => void;
}) {
  const [painelAberto, setPainelAberto] = useState<"layout" | "tema" | "">(config.experiencia === "vitrine" ? "layout" : "tema");
  useEffect(() => {
    setPainelAberto(config.experiencia === "vitrine" ? "layout" : "tema");
  }, [config.experiencia]);
  const reduzirMovimento = useReducedMotion();
  const totalTemas = temaIds.length;
  const temasFigaro = temaIds.filter((tema) => tema.startsWith("figaro-")).length;
  const temasCortai = totalTemas - temasFigaro;
  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible {...(painelAberto ? { value: painelAberto } : {})} onValueChange={(value) => setPainelAberto(value === "layout" || value === "tema" ? value : "")} className="space-y-3">
        {config.experiencia === "vitrine" ? (
        <AccordionItem value="layout" className="overflow-hidden rounded-xl border border-line bg-ink">
          <AccordionTrigger className="min-h-[68px] gap-3 px-4 text-left hover:no-underline [&>svg]:shrink-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink2 text-gold">
              <LayoutTemplate size={21} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-mute">LAYOUT</span>
              <span className="mt-1 block text-base font-semibold text-paper">{LAYOUTS[config.layout]}</span>
              <span className="mt-1 block text-xs text-mute">{totalTemas} temas: {temasCortai} do Cortaí e {temasFigaro} do Figaro</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3">
              {(Object.keys(LAYOUTS) as LayoutId[]).map((layout) => {
                const selecionado = config.layout === layout;
                const secoesAtivas = componenteIds.filter((id) => config.componentes[id]);
                const visiveis = secoesAtivas.slice(0, 5);
                const restantes = secoesAtivas.length - visiveis.length;
                return (
                  <motion.div
                    key={layout}
                    initial={false}
                    animate={{ scale: selecionado ? 0.97 : 1 }}
                    transition={reduzirMovimento ? { duration: 0 } : MOLA.padraoCompose}
                    className="w-[min(78vw,286px)] shrink-0 snap-start"
                    data-selecionado={selecionado ? "true" : undefined}
                  >
                  <Button
                    type="button"
                    variant="ghost"
                    aria-pressed={selecionado}
                    onClick={() => setLayout(layout)}
                    className={`relative h-auto min-h-[300px] w-full flex-col items-stretch whitespace-normal border p-3 text-left transition-[border-color,background-color,box-shadow,border-radius] duration-200 ease-out motion-reduce:transition-none ${selecionado ? "rounded-lg border-2 border-gold bg-gold/10" : "rounded-xl border-line bg-ink"}`}
                  >
                    <MiniaturaLayout layout={layout} />
                    <span className="flex items-center justify-between gap-2 text-base font-semibold text-paper">
                      {LAYOUTS[layout]}
                      {selecionado ? <IndicadorSelecionado /> : <span className="size-6 shrink-0 rounded-full border border-line2" aria-hidden />}
                    </span>
                    <span className="mt-1 text-xs leading-relaxed text-mute">{DESCRICOES_LAYOUT[layout]}</span>
                    <span className="mt-2 block text-[11px] font-medium text-mute">{secoesAtivas.length} seções ativas na sua página</span>
                    <span className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px] text-mute">
                      {visiveis.map((id) => (
                        <span key={id} className="truncate">• {ROTULOS_SECOES[id]}</span>
                      ))}
                      {restantes > 0 ? <span className="font-semibold text-paper">+{restantes} seções</span> : null}
                    </span>
                    {layout.startsWith("figaro-") ? (
                      <span className="mt-auto pt-2 text-[11px] font-medium text-mute">Layout recuperado do Figaro</span>
                    ) : (
                      <span className="mt-auto pt-2 text-[11px] font-medium text-mute">Layout do Cortaí</span>
                    )}
                    <span className="pt-1 text-xs text-mute">{totalTemas} temas disponíveis neste editor</span>
                  </Button>
                  </motion.div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
        ) : (
          <div className="rounded-xl border border-line bg-ink px-4 py-3 text-sm leading-relaxed text-mute">
            A escolha de layout é usada na experiência Vitrine. Para acessar os sete layouts, abra Conteúdo e selecione Vitrine como experiência da página.
          </div>
        )}

        <AccordionItem value="tema" className="overflow-hidden rounded-xl border border-line bg-ink">
          <AccordionTrigger className="min-h-[68px] gap-3 px-4 text-left hover:no-underline [&>svg]:shrink-0">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-background">
              <span className="size-full" style={{ background: `linear-gradient(135deg, ${config.cores.principal}, ${config.cores.destaque}, ${config.cores.fundo})` }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-mute">TEMA</span>
              <span className="mt-1 block text-base font-semibold text-paper">{TEMAS[config.tema].nome}</span>
              <span className="mt-1 block text-xs text-mute">{totalTemas} temas disponíveis</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3">
              {temaIds.map((tema) => (
                <TemaCartao
                  key={tema}
                  tema={tema}
                  selecionado={config.tema === tema}
                  escolher={() => escolherTema(tema)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

    </div>
  );
}
