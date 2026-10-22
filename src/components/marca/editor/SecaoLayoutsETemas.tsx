import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, LayoutTemplate } from "lucide-react";

import {
  LAYOUTS,
  LAYOUTS_DO_FIGARO,
  TEMAS,
  TEMAS_DO_CATALOGO,
  type LayoutId,
  type PaginaConfig,
  type TemaId,
} from "@/lib/pagina-config";
import { MOLA } from "@/lib/movimento-figaro";
import { CartaoDeLayout, CartaoDeTema } from "./CartoesDeLayoutTema";
import { CapaDoTema } from "./CapaDoTema";

type Painel = "layout" | "tema" | "";

function Cabecalho({
  rotulo,
  valor,
  selo,
  aberto,
  onClick,
  leading,
}: {
  rotulo: string;
  valor: string;
  selo?: string;
  aberto: boolean;
  onClick: () => void;
  leading: React.ReactNode;
}) {
  const reduzirMovimento = useReducedMotion();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={aberto}
      className="flex min-h-[68px] w-full items-center gap-3 px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-mute">
            {rotulo}
          </span>
          {selo ? (
            <span className="rounded-full bg-ink3 px-2.5 py-0.5 text-[11px] font-semibold text-mute">
              {selo}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[17px] font-bold tracking-[-0.005em] text-paper">
          {valor}
        </span>
      </span>
      <motion.span
        aria-hidden
        animate={{ rotate: aberto ? 180 : 0 }}
        transition={reduzirMovimento ? { duration: 0 } : MOLA.setaAcordeao}
        className="shrink-0 text-mute"
      >
        <ChevronDown size={26} />
      </motion.span>
    </button>
  );
}

/** Conteúdo que abre e fecha em altura, com a mola de tamanho do Figaro. */
function Painel({ aberto, children }: { aberto: boolean; children: React.ReactNode }) {
  const reduzirMovimento = useReducedMotion();
  return (
    <motion.div
      initial={false}
      animate={{ height: aberto ? "auto" : 0, opacity: aberto ? 1 : 0 }}
      transition={
        reduzirMovimento ? { duration: 0 } : { height: MOLA.tamanho, opacity: MOLA.tamanho }
      }
      style={{ overflow: "hidden" }}
      aria-hidden={!aberto}
      inert={!aberto}
    >
      {children}
    </motion.div>
  );
}

/**
 * Layout & Tema do Figaro (`LayoutThemeScreen`, spec 4 §4): dois painéis exclusivos — LAYOUT e TEMA — com
 * carrossel de cartões de 286 px. O catálogo é o do Figaro (2 layouts × 3 temas). O layout ou tema antigo do
 * Cortaí, se for o atual, aparece só como valor no cabeçalho até a pessoa escolher outro.
 */
export function SecaoLayoutsETemas({
  config,
  setLayout,
  escolherTema,
}: {
  config: PaginaConfig;
  setLayout: (layout: LayoutId) => void;
  escolherTema: (tema: TemaId) => void;
}) {
  const [aberto, setAberto] = useState<Painel>("layout");
  const alternar = (painel: Exclude<Painel, "">) =>
    setAberto((atual) => (atual === painel ? "" : painel));

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-[28px] bg-ink2" aria-label="Layout">
        <Cabecalho
          rotulo="Layout"
          selo={`${TEMAS_DO_CATALOGO.length} temas`}
          valor={LAYOUTS[config.layout]}
          aberto={aberto === "layout"}
          onClick={() => alternar("layout")}
          leading={
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink3 text-gold">
              <LayoutTemplate size={24} aria-hidden />
            </span>
          }
        />
        <Painel aberto={aberto === "layout"}>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
            {LAYOUTS_DO_FIGARO.map((layout) => (
              <CartaoDeLayout
                key={layout}
                layout={layout}
                selecionado={config.layout === layout}
                escolher={() => setLayout(layout)}
              />
            ))}
          </div>
        </Painel>
      </section>

      <section className="overflow-hidden rounded-[28px] bg-ink2" aria-label="Tema">
        <Cabecalho
          rotulo="Tema"
          valor={TEMAS[config.tema].nome}
          aberto={aberto === "tema"}
          onClick={() => alternar("tema")}
          leading={
            <span className="size-10 shrink-0 overflow-hidden rounded-xl">
              <CapaDoTema tema={config.tema} />
            </span>
          }
        />
        <Painel aberto={aberto === "tema"}>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
            {TEMAS_DO_CATALOGO.map((tema) => (
              <CartaoDeTema
                key={tema}
                tema={tema}
                selecionado={config.tema === tema}
                escolher={() => escolherTema(tema)}
              />
            ))}
          </div>
        </Painel>
      </section>
    </div>
  );
}
