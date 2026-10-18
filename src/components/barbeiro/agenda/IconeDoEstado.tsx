import {
  Check,
  CircleCheck,
  CirclePlay,
  CircleX,
  Clock3,
  PersonStanding,
  TriangleAlert,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { ROTULO_DO_GLIFO, type GlifoDoEstado } from "./cartao-figaro";

const ICONE_DO_GLIFO: Record<GlifoDoEstado, LucideIcon> = {
  confirmado: CircleCheck,
  "pendente-online": Clock3,
  "pendente-equipe": PersonStanding,
  chegou: UserCheck,
  atendimento: CirclePlay,
  atrasado: Clock3,
  concluido: Check,
  cancelado: CircleX,
  falta: TriangleAlert,
};

/** Ícone do estado no canto do cartão (Figaro `AgendaStatusGlyph`); o nome vai no aria-label. */
export function IconeDoEstado({ glifo }: { glifo: GlifoDoEstado }) {
  const Icone = ICONE_DO_GLIFO[glifo];
  return (
    <span className={`agenda-glifo is-${glifo}`} role="img" aria-label={ROTULO_DO_GLIFO[glifo]}>
      <Icone aria-hidden className="size-full" />
    </span>
  );
}
