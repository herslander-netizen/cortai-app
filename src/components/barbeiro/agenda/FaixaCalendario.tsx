import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { tituloDoMes } from "./calendario";

function paraData(dia: string) {
  const [ano = 1970, mes = 1, data = 1] = dia.split("-").map(Number);
  return new Date(ano, mes - 1, data);
}

function deData(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

/** Calendário mensal recolhido: abre em folha e volta à Agenda após selecionar. */
export function FaixaCalendario({
  dia,
  onDia,
  expandido,
  onExpandido,
}: {
  dia: string;
  hoje: string;
  onDia: (dia: string) => void;
  profissionalId: string | null;
  expandido: boolean;
  onExpandido: (v: boolean) => void;
  mesVisivel: string;
  onMesVisivel: (mes: string) => void;
}) {
  return (
    <Sheet open={expandido} onOpenChange={onExpandido}>
      <SheetContent side="bottom" className="mx-auto w-full max-w-lg rounded-t-lg border-line bg-ink2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="flex items-center gap-2 text-paper">
            <CalendarDays className="size-5" aria-hidden /> Escolher data
          </SheetTitle>
          <SheetDescription>{tituloDoMes(dia)}</SheetDescription>
        </SheetHeader>
        <Calendar
          mode="single"
          selected={paraData(dia)}
          defaultMonth={paraData(dia)}
          className="mx-auto mt-3"
          onSelect={(data) => {
            if (!data) return;
            onDia(deData(data));
            onExpandido(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}