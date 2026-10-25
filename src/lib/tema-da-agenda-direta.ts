import type { CSSProperties } from "react";

import { contrasteDaMarca } from "@/lib/cor-marca";
import { agendamentoStyle, TEMAS, type PaginaConfig, type TemaId } from "@/lib/pagina-config";

/**
 * Personalização da maneira direta (layout Agendamento). Cada tema do catálogo muda a composição da
 * tela de agendar, não só as cores: abertura, tipografia, forma dos cartões e dos botões. As regras de
 * forma ficam em `styles.css` (`.agendamento-marca[data-estrutura]`); aqui ficam as paletas e fontes.
 */
export type EstruturaDaAgendaDireta =
  "classica" | "palco" | "retro" | "arco" | "cartao" | "vibrante";

type Definicao = {
  estrutura: EstruturaDaAgendaDireta;
  pagina: string;
  texto: string;
  primaria: string;
};

/** Paletas ajustadas à mão (o botão do tema original é claro demais ou escuro demais para a tela de agendar). */
const PALETAS: Partial<Record<TemaId, Omit<Definicao, "estrutura">>> = {
  "figaro-classico": { pagina: "#ECEAE8", texto: "#1F1E1D", primaria: "#2B2B2A" },
  "figaro-rock-n-roll": { pagina: "#151313", texto: "#F2EFEE", primaria: "#E8582A" },
  "figaro-retro": { pagina: "#F4E38A", texto: "#2A1F3D", primaria: "#4553D9" },
  "feminino-rose": { pagina: "#FCEFF1", texto: "#4A2130", primaria: "#B76E79" },
  "feminino-lavanda": { pagina: "#F1EAFB", texto: "#33254F", primaria: "#7B5CC4" },
  "feminino-pessego": { pagina: "#FFF3EA", texto: "#4D2A1F", primaria: "#E0745A" },
};

/** Composição de cada tema do catálogo; os seis primeiros têm uma só deles, os demais reaproveitam a que combina. */
const ESTRUTURAS: Partial<Record<TemaId, EstruturaDaAgendaDireta>> = {
  "figaro-classico": "classica",
  "figaro-rock-n-roll": "palco",
  "figaro-retro": "retro",
  "feminino-rose": "arco",
  "feminino-lavanda": "cartao",
  "feminino-pessego": "vibrante",
  cortai: "cartao",
  "cortai-creme": "classica",
  nude: "arco",
  premium: "palco",
  clean: "classica",
  editorial: "classica",
};

function definicaoDe(config: PaginaConfig): Definicao | null {
  if (config.layout !== "figaro-agendamento") return null;
  const estrutura = ESTRUTURAS[config.tema];
  if (!estrutura) return null;
  const cores = TEMAS[config.tema].cores;
  const palheta = PALETAS[config.tema] ?? {
    pagina: cores.fundo,
    texto: cores.texto,
    primaria: cores.botao,
  };
  return { estrutura, ...palheta };
}

/** Só o layout Agendamento com um tema do catálogo ganha a composição própria. */
export function agendaDiretaComTema(config: PaginaConfig): boolean {
  return definicaoDe(config) !== null;
}

export function estiloDaAgendaDireta(config: PaginaConfig): CSSProperties {
  const d = definicaoDe(config);
  if (!d) return agendamentoStyle(config);
  const efetiva: PaginaConfig = {
    ...config,
    cores: { ...TEMAS[config.tema].cores, fundo: d.pagina, texto: d.texto },
    chat: { ...config.chat, superficie: "tema" },
  };
  return {
    ...agendamentoStyle(efetiva),
    "--chat-primary": d.primaria,
    "--chat-primary-foreground": contrasteDaMarca(d.primaria),
  } as CSSProperties;
}

export function atributosDaAgendaDireta(config: PaginaConfig): Record<string, string> {
  const d = definicaoDe(config);
  return d
    ? { "data-direto": "true", "data-tema": config.tema, "data-estrutura": d.estrutura }
    : {};
}
