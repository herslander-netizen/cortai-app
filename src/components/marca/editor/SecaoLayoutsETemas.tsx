import { useEffect, useState } from "react";
import { Eye, LayoutTemplate, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { LayoutId, PaginaConfig, TemaId } from "@/lib/pagina-config";
import { componenteIds, LAYOUTS, TEMAS, temaIds } from "@/lib/pagina-config";
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
                  <Button
                    key={layout}
                    type="button"
                    variant="ghost"
                    aria-pressed={selecionado}
                    onClick={() => setLayout(layout)}
                    className={`relative h-auto min-h-[300px] w-[min(78vw,286px)] shrink-0 snap-start flex-col items-stretch whitespace-normal rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${selecionado ? "border-2 border-gold bg-gold/10" : "border-line bg-ink"}`}
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink px-4 py-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-mute">
          Os layouts e temas do Cortaí continuam disponíveis junto às opções recuperadas do Figaro. Os temas Figaro usam paletas adaptadas, e a prévia mostra como cada opção fica com o conteúdo real do seu negócio.
        </p>
        <Button type="button" variant="outline" className="min-h-12 w-full sm:w-auto" onClick={onVerExemplo}>
          <Eye size={17} aria-hidden />
          Ver Exemplo
        </Button>
      </div>
      <p className="flex items-center gap-2 px-1 text-xs text-mute">
        <Palette size={14} aria-hidden />
        A seleção só altera a edição em andamento; use a ação de salvar rascunho ou publicar para persistir.
      </p>
    </div>
  );
}
