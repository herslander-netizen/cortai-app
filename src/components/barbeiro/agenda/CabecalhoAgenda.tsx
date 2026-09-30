import { ChevronLeft, ChevronRight, HelpCircle, ListOrdered, Lock, Maximize2, MoreHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { useGuia } from "@/components/guia/GuiaProvider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { dataEditorial, somarDias } from "./tempo";

function paraData(dia: string) {
  const [a = 1970, m = 1, d = 1] = dia.split("-").map(Number);
  return new Date(a, m - 1, d);
}
function deData(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function CabecalhoAgenda({
  dia,
  ehHoje,
  onDia,
  onHoje,
  fila,
  onFila,
  onModoFoco,
  focoNoPlano,
  resumo,
  children,
}: {
  dia: string;
  ehHoje: boolean;
  onDia: (dia: string) => void;
  onHoje: () => void;
  fila: number;
  onFila: () => void;
  onModoFoco: () => void;
  focoNoPlano: boolean;
  resumo: ReactNode;
  children?: ReactNode;
}) {
  const [calendario, setCalendario] = useState(false);
  const { guiaDisponivel, abrirGuia } = useGuia();
  return (
    <header className="agenda-cabecalho-compacto agenda-cabecalho-unico">
      <h1 className="sr-only">Agenda</h1>
      <div className="agenda-cabecalho-linha">
        <Button variant="ghost" size="icon" aria-label="Dia anterior" onClick={() => onDia(somarDias(dia, -1))}>
          <ChevronLeft />
        </Button>
        <Popover open={calendario} onOpenChange={setCalendario}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="agenda-data-botao"
              aria-label={`${ehHoje ? "Hoje, " : ""}${dataEditorial(dia)}. Abrir calendário`}
            >
              <strong>{ehHoje ? "Hoje" : dataEditorial(dia)}</strong>
              {ehHoje ? <span>{dataEditorial(dia)}</span> : null}
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-auto border-line bg-ink2 p-2">
            <Calendar
              mode="single"
              selected={paraData(dia)}
              defaultMonth={paraData(dia)}
              onSelect={(data) => {
                if (data) onDia(deData(data));
                setCalendario(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" aria-label="Próximo dia" onClick={() => onDia(somarDias(dia, 1))}>
          <ChevronRight />
        </Button>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!ehHoje ? (
            <Button size="sm" variant="secondary" className="min-h-11" onClick={onHoje}>
              Hoje
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mais opções da agenda" className="relative">
                <MoreHorizontal />
                {fila > 0 ? <span className="agenda-ponto" aria-hidden /> : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 border-line bg-ink2">
              <DropdownMenuItem className="min-h-11" onSelect={onModoFoco}>
                {focoNoPlano ? <Maximize2 /> : <Lock />}
                Modo Foco
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11" onSelect={onFila}>
                <ListOrdered />
                Fila de chegada{fila > 0 ? ` (${fila})` : ""}
              </DropdownMenuItem>
              {guiaDisponivel ? (
                <DropdownMenuItem className="min-h-11" onSelect={abrirGuia}>
                  <HelpCircle />
                  Ajuda desta tela
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <p className="agenda-resumo-dia" aria-live="polite">
        {resumo}
      </p>
      {children}
    </header>
  );
}
