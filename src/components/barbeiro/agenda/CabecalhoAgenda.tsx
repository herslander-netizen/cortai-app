import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Eye,
  EyeOff,
  List,
  ListOrdered,
  Lock,
  Maximize2,
  MoreHorizontal,
} from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

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

export type VisualizacaoAgenda = "lista" | "timeline" | "semana";

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
  visualizacao,
  onVisualizacao,
  mostrarSemana,
  onTeclasVisualizacao,
  discreto,
  onDiscreto,
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
  visualizacao: VisualizacaoAgenda;
  onVisualizacao: (visualizacao: VisualizacaoAgenda) => void;
  mostrarSemana: boolean;
  onTeclasVisualizacao: (e: KeyboardEvent<HTMLDivElement>) => void;
  discreto: boolean;
  onDiscreto: () => void;
  children?: ReactNode;
}) {
  const [calendario, setCalendario] = useState(false);
  const { guiaDisponivel, abrirGuia } = useGuia();
  const opcoes = [
    { id: "timeline" as const, rotulo: "Timeline", Icone: CalendarClock },
    { id: "lista" as const, rotulo: "Lista", Icone: List },
    ...(mostrarSemana ? [{ id: "semana" as const, rotulo: "Semana", Icone: CalendarDays }] : []),
  ];
  return (
    <header className="agenda-cabecalho-compacto agenda-cabecalho-unico">
      <h1 className="sr-only">Agenda</h1>
      <div className="agenda-cabecalho-linha">
        <Popover open={calendario} onOpenChange={setCalendario}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="agenda-data-botao min-h-12"
              aria-label={`${ehHoje ? "Hoje, " : ""}${dataEditorial(dia)}. Abrir calendário`}
            >
              <strong>{ehHoje ? "Hoje" : dataEditorial(dia)}</strong>
              {ehHoje ? <span>{dataEditorial(dia)}</span> : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto border-line bg-ink2 p-2">
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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dia anterior"
          onClick={() => onDia(somarDias(dia, -1))}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Próximo dia"
          onClick={() => onDia(somarDias(dia, 1))}
        >
          <ChevronRight />
        </Button>
        {discreto ? (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label="Desativar modo discreto"
            onClick={onDiscreto}
          >
            <EyeOff />
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mais opções da agenda"
              className={`relative ${discreto ? "" : "ml-auto"}`}
            >
              <MoreHorizontal />
              {fila > 0 ? <span className="agenda-ponto" aria-hidden /> : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52 border-line bg-ink2">
            <DropdownMenuItem className="min-h-12" onSelect={onModoFoco}>
              {focoNoPlano ? <Maximize2 /> : <Lock />} Modo Foco
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-12" onSelect={onFila}>
              <ListOrdered /> Fila de chegada{fila > 0 ? ` (${fila})` : ""}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-12" onSelect={onDiscreto}>
              {discreto ? <EyeOff /> : <Eye />} {discreto ? "Desativar" : "Ativar"} modo discreto
            </DropdownMenuItem>
            {guiaDisponivel ? (
              <DropdownMenuItem className="min-h-12" onSelect={abrirGuia}>
                <HelpCircle /> Ajuda desta tela
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1">
        <p className="agenda-resumo-dia min-w-0 flex-1 truncate text-left" aria-live="polite">
          {resumo}
        </p>
        {!ehHoje ? (
          <Button variant="ghost" className="min-h-12 shrink-0 px-3" onClick={onHoje}>
            Hoje
          </Button>
        ) : null}
        <div
          className="flex shrink-0"
          role="group"
          aria-label="Visualização da agenda"
          onKeyDown={onTeclasVisualizacao}
        >
          {opcoes.map(({ id, rotulo, Icone }) => (
            <Button
              key={id}
              id={`agenda-aba-${id}`}
              variant="ghost"
              size="icon"
              className={visualizacao === id ? "bg-ink3 text-paper" : "text-mute"}
              aria-label={rotulo}
              aria-pressed={visualizacao === id}
              tabIndex={visualizacao === id ? 0 : -1}
              onClick={() => onVisualizacao(id)}
            >
              <Icone />
            </Button>
          ))}
        </div>
      </div>
      {children}
    </header>
  );
}
