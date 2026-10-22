import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";

import { MOLA } from "@/lib/movimento-figaro";
import { SECOES_OBRIGATORIAS, secoesDoLayoutAtual, type PaginaConfig } from "@/lib/pagina-config";
import { CATALOGO_DE_SECOES, FLUXO_DE_AGENDAMENTO, type ComponenteId } from "./secoes/catalogo";

type Linha = {
  id: ComponenteId | "fluxo";
  nome: string;
  icone: (typeof FLUXO_DE_AGENDAMENTO)["icone"];
  editavel: boolean;
};

function LinhaDeSecao({
  linha,
  posicao,
  reduzirMovimento,
}: {
  linha: Linha;
  posicao: "unica" | "primeira" | "meio" | "ultima";
  reduzirMovimento: boolean | null;
}) {
  const Icone = linha.icone;
  // Como no Figaro: as linhas formam uma pilha de cartões, com os cantos grandes só nas pontas.
  const raio = {
    unica: "rounded-[28px]",
    primeira: "rounded-t-[28px] rounded-b-md",
    meio: "rounded-md",
    ultima: "rounded-t-md rounded-b-[28px]",
  }[posicao];
  const conteudo = (
    <>
      <Icone size={26} className="shrink-0 text-gold" aria-hidden />
      <span className="min-w-0 flex-1 text-base text-paper">{linha.nome}</span>
      {linha.editavel ? (
        <ChevronRight size={20} className="shrink-0 text-mute" aria-hidden />
      ) : null}
    </>
  );
  const classes = `flex min-h-[72px] items-center gap-5 bg-ink2 px-6 py-4 ${raio}`;
  return (
    <motion.li
      layout={!reduzirMovimento}
      initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={reduzirMovimento ? { duration: 0.12 } : MOLA.padraoCompose}
    >
      {linha.editavel && linha.id !== "fluxo" ? (
        <Link
          to="/barbeiro/marca/secao/$secao"
          params={{ secao: linha.id }}
          className={`${classes} cursor-pointer transition-colors hover:bg-ink3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          {conteudo}
        </Link>
      ) : (
        <div className={classes}>{conteudo}</div>
      )}
    </motion.li>
  );
}

function Grupo({
  titulo,
  linhas,
  reduzirMovimento,
}: {
  titulo: string;
  linhas: Linha[];
  reduzirMovimento: boolean | null;
}) {
  if (linhas.length === 0) return null;
  return (
    <section aria-label={titulo} className="space-y-2">
      <h3 className="px-2 text-sm font-medium text-mute">{titulo}</h3>
      <ul className="flex flex-col gap-0.5">
        <AnimatePresence initial={false}>
          {linhas.map((linha, i) => (
            <LinhaDeSecao
              key={linha.id}
              linha={linha}
              reduzirMovimento={reduzirMovimento}
              posicao={
                linhas.length === 1
                  ? "unica"
                  : i === 0
                    ? "primeira"
                    : i === linhas.length - 1
                      ? "ultima"
                      : "meio"
              }
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

/**
 * Lista de seções da página no padrão do Figaro (`PageSettingsScreen`, spec 4 §2.3): três grupos —
 * obrigatórias (ativas ou não), ativas e inativas —, cada linha com ícone e nome, sem switch. Tocar abre o
 * editor da seção, onde se oculta ou ativa. O fluxo de agendamento é sempre obrigatório e não tem editor.
 */
export function SecaoConteudo({ config }: { config: PaginaConfig }) {
  const reduzirMovimento = useReducedMotion();
  const obrigatorias = SECOES_OBRIGATORIAS[config.layout];
  const linha = (id: ComponenteId): Linha => ({
    id,
    nome: CATALOGO_DE_SECOES[id].nome,
    icone: CATALOGO_DE_SECOES[id].icone,
    editavel: true,
  });
  const fluxo: Linha = { id: "fluxo", ...FLUXO_DE_AGENDAMENTO, editavel: false };
  const doLayout = secoesDoLayoutAtual(config.layout);
  const obrigatoriasLista = [
    fluxo,
    ...doLayout.filter((id) => obrigatorias.includes(id)).map(linha),
  ];
  const livres = doLayout.filter((id) => !obrigatorias.includes(id));
  const ativas = livres.filter((id) => config.componentes[id]).map(linha);
  const inativas = livres.filter((id) => !config.componentes[id]).map(linha);

  return (
    <div className="space-y-6">
      <Grupo
        titulo="Seções obrigatórias"
        linhas={obrigatoriasLista}
        reduzirMovimento={reduzirMovimento}
      />
      <Grupo titulo="Seções ativas" linhas={ativas} reduzirMovimento={reduzirMovimento} />
      <Grupo titulo="Seções inativas" linhas={inativas} reduzirMovimento={reduzirMovimento} />
    </div>
  );
}
