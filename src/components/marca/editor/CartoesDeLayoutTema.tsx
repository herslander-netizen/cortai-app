import { motion, useReducedMotion } from "framer-motion";
import { Check, Ellipsis, Palette } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import {
  componenteIds,
  DESCRICAO_DO_LAYOUT,
  LAYOUTS,
  SECOES_DO_LAYOUT,
  TEMAS,
  TEMAS_DO_FIGARO,
  type LayoutId,
  type TemaId,
} from "@/lib/pagina-config";
import { CATALOGO_DE_SECOES, FLUXO_DE_AGENDAMENTO } from "./secoes/catalogo";
import { CapaDoTema } from "./CapaDoTema";

export const DESCRICOES_LAYOUT = DESCRICAO_DO_LAYOUT;

/** Seções que o layout oferece, na ordem do Figaro; o fluxo de agendamento sempre existe. */
export function secoesDoLayout(layout: LayoutId) {
  const ids = SECOES_DO_LAYOUT[layout] ?? componenteIds;
  const itens = ids.map((id) => ({ id: id as string, ...CATALOGO_DE_SECOES[id] }));
  if (layout === "figaro-agendamento")
    return [{ id: "fluxo", ...FLUXO_DE_AGENDAMENTO, descricao: "" }, ...itens];
  return [...itens, { id: "fluxo", ...FLUXO_DE_AGENDAMENTO, descricao: "" }];
}

/** Marca de selecionado do cartão (`check badge` de 24 dp): círculo com ✓, na cor do tipo. */
export function IndicadorSelecionado({ tom = "layout" }: { tom?: "layout" | "tema" }) {
  const reduzirMovimento = useReducedMotion();
  return (
    <motion.span
      initial={reduzirMovimento ? false : { opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduzirMovimento ? { duration: 0 } : MOLA.setaAcordeao}
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-white ${tom === "tema" ? "bg-rosa" : "bg-gold"}`}
      aria-hidden
    >
      <Check size={16} strokeWidth={3} />
    </motion.span>
  );
}

function MarcaVazia() {
  return <span className="size-6 shrink-0 rounded-full border-2 border-line2" aria-hidden />;
}

const LARGURA_DO_CARTAO = "w-[286px] max-w-[78vw]";

/** Cartão de layout (`LayoutCard`): nome, descrição, "N temas", grade de seções com "+N seções". */
export function CartaoDeLayout({
  layout,
  selecionado,
  escolher,
}: {
  layout: LayoutId;
  selecionado: boolean;
  escolher: () => void;
}) {
  const secoes = secoesDoLayout(layout);
  const mostrar = secoes.length > 6 ? secoes.slice(0, 5) : secoes;
  const restantes = secoes.length - mostrar.length;
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={escolher}
      className={`relative flex shrink-0 snap-start flex-col rounded-[28px] bg-background p-5 text-left transition-[border-color] duration-200 motion-reduce:transition-none ${LARGURA_DO_CARTAO} ${selecionado ? "border-2 border-gold" : "border border-line"}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[22px] font-bold leading-[26px] tracking-tight text-gold">
          {LAYOUTS[layout]}
        </span>
        {selecionado ? <IndicadorSelecionado /> : <MarcaVazia />}
      </span>
      <span className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-mute">
        {DESCRICAO_DO_LAYOUT[layout]}
      </span>
      <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-gold">
        <Palette size={15} aria-hidden />
        {TEMAS_DO_FIGARO.length} temas disponíveis
      </span>
      <span className="my-3 block h-px bg-line" aria-hidden />
      <span className="grid min-h-[78px] grid-cols-2 gap-x-3 gap-y-3">
        {mostrar.map((s) => {
          const Icone = s.icone;
          return (
            <span key={s.id} className="flex items-center gap-2 text-[13px] text-paper">
              <Icone size={18} className="shrink-0 text-mute" aria-hidden />
              <span className="min-w-0 truncate">{s.nome}</span>
            </span>
          );
        })}
        {restantes > 0 ? (
          <span className="flex items-center gap-2 text-[13px] font-semibold text-gold">
            <Ellipsis size={18} aria-hidden />+{restantes} seções
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** Cartão de tema (`ThemeCard`): banner 2,9:1, pílula de 56×6 na cor de destaque, nome e descrição. */
export function CartaoDeTema({
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
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={escolher}
      className={`relative flex shrink-0 snap-start flex-col overflow-hidden rounded-[28px] bg-background text-left transition-[border-color] duration-200 motion-reduce:transition-none ${LARGURA_DO_CARTAO} ${selecionado ? "border-2 border-rosa" : "border border-line"}`}
    >
      <span className="relative block aspect-[2.9/1] w-full overflow-hidden">
        <CapaDoTema tema={tema} />
        <span
          aria-hidden
          className="absolute bottom-3 left-3.5 block h-1.5 w-14 rounded-full"
          style={{ backgroundColor: definicao.cores.destaque }}
        />
        <span className="absolute right-3 top-3">
          {selecionado ? <IndicadorSelecionado tom="tema" /> : <MarcaVazia />}
        </span>
      </span>
      <span className="block px-4 py-5">
        <span className="block text-[22px] font-bold leading-[26px] tracking-tight text-paper">
          {definicao.nome}
        </span>
        <span className="mt-1 block text-sm leading-5 text-mute">{definicao.descricao}</span>
      </span>
    </button>
  );
}
