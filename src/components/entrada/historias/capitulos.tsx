/**
 * Os cinco capítulos da entrada (vídeo de referência e inspiração do dono, 06/11/2026), na ordem da inspiração:
 * gestão, agenda, atendimento no WhatsApp, lembretes e site. Avaliações saiu e o atendimento automático no WhatsApp
 * entrou (dono, 06/11/2026).
 */
import type { ReactNode } from "react";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  Globe,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

import { duracaoTotal } from "./base";
import { HistoriaAgenda, PASSOS_AGENDA } from "./HistoriaAgenda";
import { HistoriaSite, PASSOS_SITE } from "./HistoriaSite";
import { HistoriaGestao, PASSOS_GESTAO } from "./HistoriaGestao";
import { HistoriaLembretes, PASSOS_LEMBRETES } from "./HistoriasDoNegocio";
import { HistoriaWhatsapp, PASSOS_WHATSAPP } from "./HistoriaWhatsapp";

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
    id: "gestao",
    icone: BarChart3,
    rotulo: "Gestão completa",
    frase: "Tudo o que o seu negócio precisa\nem um só lugar.",
    duracao: duracaoTotal(PASSOS_GESTAO),
    historia: () => <HistoriaGestao />,
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
    id: "whatsapp",
    icone: MessageCircle,
    rotulo: "WhatsApp",
    frase: "O cliente marca pelo WhatsApp,\nsozinho, a qualquer hora.",
    duracao: duracaoTotal(PASSOS_WHATSAPP),
    historia: () => <HistoriaWhatsapp />,
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
    id: "site",
    icone: Globe,
    rotulo: "Seu site",
    frase: "Sua página mostra serviços,\nequipe e preços com a sua cara.",
    duracao: duracaoTotal(PASSOS_SITE),
    historia: () => <HistoriaSite />,
  },
];
