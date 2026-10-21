import { Check, Eye, LayoutTemplate, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { LayoutId, PaginaConfig, TemaId } from "@/lib/pagina-config";
import { LAYOUTS, TEMAS, temaIds } from "@/lib/pagina-config";
import { MiniaturaDoTema } from "./MiniaturaDoTema";

const DESCRICOES_LAYOUT: Record<LayoutId, string> = {
  cinematografico: "Capa marcante e apresentação com bastante presença.",
  "logo-central": "Marca e conteúdo alinhados ao centro.",
  minimalista: "Visual discreto, com foco no nome e nas informações.",
  "foto-destaque": "Fotografia em evidência na abertura da página.",
  editorial: "Composição editorial, com largura e títulos mais contidos.",
};

function MiniaturaLayout({ layout }: { layout: LayoutId }) {
  return (
    <div
      className="flex h-28 w-full flex-col overflow-hidden rounded-md border border-line bg-background p-2"
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

function TemaCartao({
  tema,
  selecionado,
  escolher,
}: {
  tema: TemaId;
  selecionado: boolean;
  escolher: () => void;
}) {
  const definicao = TEMAS[tema];
  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={selecionado}
      onClick={escolher}
      className={`relative h-auto min-h-[218px] w-[min(78vw,286px)] shrink-0 snap-start flex-col items-stretch whitespace-normal rounded-xl border p-3 text-left ${selecionado ? "border-2 border-gold bg-gold/10" : "border-line bg-ink"}`}
    >
      <MiniaturaDoTema cores={definicao.cores} />
      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-paper">
        {definicao.nome}
        {selecionado ? <Check size={18} className="shrink-0 text-gold" aria-hidden /> : null}
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-mute">{definicao.descricao}</span>
      <span className="mt-auto flex h-2 overflow-hidden rounded-full" aria-hidden>
        {[definicao.cores.principal, definicao.cores.secundaria, definicao.cores.botao, definicao.cores.fundo, definicao.cores.destaque].map((cor, i) => (
          <i key={i} className="flex-1" style={{ backgroundColor: cor }} />
        ))}
      </span>
    </Button>
  );
}

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
  const totalTemas = temaIds.length;
  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible defaultValue="layout" className="space-y-3">
        {config.experiencia === "vitrine" ? (
        <AccordionItem value="layout" className="overflow-hidden rounded-xl border border-line bg-ink">
          <AccordionTrigger className="min-h-[68px] gap-3 px-4 text-left hover:no-underline [&>svg]:shrink-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink2 text-gold">
              <LayoutTemplate size={21} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-mute">LAYOUT</span>
              <span className="mt-1 block text-base font-semibold text-paper">{LAYOUTS[config.layout]}</span>
              <span className="mt-1 block text-xs text-mute">{totalTemas} temas atuais do Cortaí disponíveis</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3">
              {(Object.keys(LAYOUTS) as LayoutId[]).map((layout) => {
                const selecionado = config.layout === layout;
                return (
                  <Button
                    key={layout}
                    type="button"
                    variant="ghost"
                    aria-pressed={selecionado}
                    onClick={() => setLayout(layout)}
                    className={`relative h-auto min-h-[228px] w-[min(78vw,286px)] shrink-0 snap-start flex-col items-stretch whitespace-normal rounded-xl border p-3 text-left ${selecionado ? "border-2 border-gold bg-gold/10" : "border-line bg-ink"}`}
                  >
                    <MiniaturaLayout layout={layout} />
                    <span className="flex items-center justify-between gap-2 text-base font-semibold text-paper">
                      {LAYOUTS[layout]}
                      {selecionado ? <Check size={18} className="shrink-0 text-gold" aria-hidden /> : null}
                    </span>
                    <span className="mt-1 text-xs leading-relaxed text-mute">{DESCRICOES_LAYOUT[layout]}</span>
                    <span className="mt-auto pt-2 text-xs font-medium text-mute">{totalTemas} temas disponíveis</span>
                  </Button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
        ) : (
          <div className="rounded-xl border border-line bg-ink px-4 py-3 text-sm leading-relaxed text-mute">
            A escolha de layout é usada na experiência Vitrine. Para ver os cinco layouts, acesse Conteúdo e selecione Vitrine como experiência de agendamento.
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
          As opções atuais do Cortaí foram mantidas. Ao escolher um layout ou tema, veja a combinação na prévia antes de salvar ou publicar.
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
