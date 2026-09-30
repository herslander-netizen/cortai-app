import { Link } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AgendaDia } from "@/lib/barbeiro.functions";

import { dataEditorial } from "./tempo";

/**
 * Folha de bloqueio dentro da agenda. Hoje o Cortaí fecha períodos pelo expediente
 * (dia fechado e intervalo); bloqueio pontual por data exige armazenamento próprio.
 */
export function BloquearHorarioSheet({
  aberto,
  onAberto,
  dia,
  horarios,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  dia: string;
  horarios: AgendaDia["horarios"];
}) {
  const dow = new Date(`${dia}T12:00:00Z`).getUTCDay();
  const h = horarios.find((x) => x.diaSemana === dow);
  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full max-w-[520px] rounded-t-xl border-line bg-ink2 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-base text-paper">Bloquear horário</SheetTitle>
          <SheetDescription className="text-sm text-mute">{dataEditorial(dia)}</SheetDescription>
        </SheetHeader>
        <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <dt className="text-mute">Expediente</dt>
            <dd className="font-semibold text-paper">
              {!h || h.fechado ? "Fechado" : `${h.abre} – ${h.fecha}`}
            </dd>
          </div>
          <div className="flex min-h-12 items-center justify-between gap-3">
            <dt className="text-mute">Intervalo</dt>
            <dd className="font-semibold text-paper">
              {h?.intervaloInicio && h.intervaloFim
                ? `${h.intervaloInicio} – ${h.intervaloFim}`
                : "Sem intervalo"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-mute">
          Para fechar almoço ou um período fixo, ajuste o intervalo do dia. Clientes não conseguem
          marcar nesses horários.
        </p>
        <Button asChild className="mt-4 w-full" size="lg">
          <Link to="/barbeiro/horarios" onClick={() => onAberto(false)}>
            <Clock3 /> Ajustar expediente e intervalo
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
