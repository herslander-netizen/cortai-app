/** Os cinco capítulos da entrada, na ordem do vídeo de referência do dono (06/11/2026), com textos próprios do Flow. */
import type { ReactNode } from "react";
import { BarChart3, BellRing, CalendarDays, Globe, Star, type LucideIcon } from "lucide-react";

import { duracaoTotal } from "./base";
import { HistoriaAgenda, PASSOS_AGENDA } from "./HistoriaAgenda";
import { HistoriaSite, PASSOS_SITE } from "./HistoriaSite";
import {
  HistoriaAvaliacoes,
  HistoriaDesempenho,
  HistoriaLembretes,
  PASSOS_AVALIACOES,
  PASSOS_DESEMPENHO,
  PASSOS_LEMBRETES,
} from "./HistoriasDoNegocio";

export type Capitulo = {
  id: string;
  icone: LucideIcon;
  rotulo: string;
  /** Duas linhas, separadas por "\n". */
  frase: string;
  duracao: number;
  historia: () => ReactNode;
};

export const CAPITULOS: readonly Capitulo[] = [
  {
    id: "site",
    icone: Globe,
    rotulo: "Seu site",
    frase: "Sua página mostra serviços,\nequipe e preços com a sua cara.",
    duracao: duracaoTotal(PASSOS_SITE),
    historia: () => <HistoriaSite />,
  },
  {
    id: "agenda",
    icone: CalendarDays,
    rotulo: "Agenda",
    frase: "O cliente escolhe o horário\ne confirma em poucos toques.",
    duracao: duracaoTotal(PASSOS_AGENDA),
    historia: () => <HistoriaAgenda />,
  },
  {
    id: "lembretes",
    icone: BellRing,
    rotulo: "Lembretes",
    frase: "Avisos no WhatsApp lembram\ncada cliente na hora certa.",
    duracao: duracaoTotal(PASSOS_LEMBRETES),
    historia: () => <HistoriaLembretes />,
  },
  {
    id: "avaliacoes",
    icone: Star,
    rotulo: "Avaliações",
    frase: "Depois do atendimento,\nas avaliações chegam sozinhas.",
    duracao: duracaoTotal(PASSOS_AVALIACOES),
    historia: () => <HistoriaAvaliacoes />,
  },
  {
    id: "desempenho",
    icone: BarChart3,
    rotulo: "Desempenho",
    frase: "Números claros para decidir\nos próximos passos do negócio.",
    duracao: duracaoTotal(PASSOS_DESEMPENHO),
    historia: () => <HistoriaDesempenho />,
  },
];
