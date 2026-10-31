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
  MoreVertical,
} from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useGuia } from "@/components/guia/GuiaProvider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { LegendaDasCores } from "./LegendaDasCores";
import { useAlvoNoTopo } from "./useAlvoNoTopo";
import { dataEditorial, somarDias } from "./tempo";
import { tituloDoMes } from "./calendario";

/** Calendário preenchido (estado aberto do modelo): bloco azul-claro com o dia marcado. */
function IconeCalendarioCheio() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 text-menu-icone">
      <rect x="3" y="4.5" width="18" height="17" rx="3.5" fill="currentColor" />
      <rect x="7" y="2" width="2.4" height="5" rx="1.2" fill="currentColor" />
      <rect x="14.6" y="2" width="2.4" height="5" rx="1.2" fill="currentColor" />
      <rect x="7" y="13" width="4.5" height="4.5" rx="1" className="fill-ink2" />
    </svg>
  );
}

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
  mostrarFila = true,
  onModoFoco,
  focoNoPlano,
  resumo,
  visualizacao,
  onVisualizacao,
  mostrarSemana,
  ocultarSeletor = false,
  celular = false,
  onTeclasVisualizacao,
  discreto,
  onDiscreto,
  tituloCelular,
  calendarioAberto = false,
  onCalendario,
  emEdicao = false,
  children,
}: {
  dia: string;
  ehHoje: boolean;
  onDia: (dia: string) => void;
  onHoje: () => void;
  fila: number;
  onFila: () => void;
  mostrarFila?: boolean;
  onModoFoco: () => void;
  focoNoPlano: boolean;
  resumo: ReactNode;
  visualizacao: VisualizacaoAgenda;
  onVisualizacao: (visualizacao: VisualizacaoAgenda) => void;
  mostrarSemana: boolean;
  ocultarSeletor?: boolean;
  /** Celular: data vai para a barra do topo, "⋯" para a linha do resumo e os chips rolam. */
  celular?: boolean;
  onTeclasVisualizacao: (e: KeyboardEvent<HTMLDivElement>) => void;
  discreto: boolean;
  onDiscreto: () => void;
  /** Celular: título "Mês Ano" (acompanha o mês aberto). */
  tituloCelular?: string;
  calendarioAberto?: boolean;
  onCalendario?: () => void;
  /** Celular, modo de editar horário: a barra do topo mostra só a data (some título e ações). */
  emEdicao?: boolean;
  children?: ReactNode;
}) {
  const [calendario, setCalendario] = useState(false);
  const { guiaDisponivel, abrirGuia } = useGuia();
  const opcoes = [
    { id: "timeline" as const, rotulo: "Timeline", Icone: CalendarClock },
    { id: "lista" as const, rotulo: "Lista", Icone: List },
    ...(mostrarSemana ? [{ id: "semana" as const, rotulo: "Semana", Icone: CalendarDays }] : []),
  ];
  const topo = useAlvoNoTopo("topo-centro", celular);
  const data = (
    <>
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
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDia(somarDias(dia, -1));
        }}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Próximo dia"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDia(somarDias(dia, 1));
        }}
      >
        <ChevronRight />
      </Button>
    </>
  );
  const menu = (
    <>
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
            className={`relative ${discreto ? "" : "ml-auto"} ${celular ? "w-9 min-w-9" : ""}`}
          >
            {celular ? <MoreVertical /> : <MoreHorizontal />}
            {fila > 0 ? <span className="agenda-ponto" aria-hidden /> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52 border-line bg-ink2">
          {celular ? (
            <>
              <DropdownMenuLabel className="max-w-72 whitespace-normal text-sm font-normal text-mute">
                {resumo}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem className="min-h-12" onSelect={onModoFoco}>
            {focoNoPlano ? <Maximize2 /> : <Lock />} Modo Foco
          </DropdownMenuItem>
          {mostrarFila ? (
            <DropdownMenuItem className="min-h-12" onSelect={onFila}>
              <ListOrdered /> Fila de chegada{fila > 0 ? ` (${fila})` : ""}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="min-h-12" onSelect={onDiscreto}>
            {discreto ? <EyeOff /> : <Eye />} {discreto ? "Desativar" : "Ativar"} modo discreto
          </DropdownMenuItem>
          {guiaDisponivel ? (
            <DropdownMenuItem className="min-h-12" onSelect={abrirGuia}>
              <HelpCircle /> Ajuda desta tela
            </DropdownMenuItem>
          ) : null}
          <LegendaDasCores />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
  // Celular: "Mês Ano" grande à esquerda, calendário e "…" (o sino vem da barra do app).
  const topoCelular = (
    <>
      <Button
        variant="ghost"
        className="min-h-12 min-w-0 flex-1 justify-start px-0.5 hover:bg-transparent"
        aria-label={`${tituloCelular ?? tituloDoMes(dia)}. ${calendarioAberto ? "Recolher mês" : "Abrir mês"}`}
        aria-expanded={calendarioAberto}
        onClick={onCalendario}
      >
        <span className="truncate text-[clamp(18px,5vw,22px)] leading-none text-paper">
          <strong className="font-semibold">
            {(tituloCelular ?? tituloDoMes(dia)).split(" ")[0]}
          </strong>{" "}
          <span className="font-normal">{(tituloCelular ?? tituloDoMes(dia)).split(" ")[1]}</span>
        </span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-11 min-w-11 shrink-0 rounded-none border-0 bg-transparent shadow-none hover:bg-transparent active:bg-transparent"
        aria-label={calendarioAberto ? "Recolher calendário" : "Abrir calendário"}
        aria-pressed={calendarioAberto}
        onClick={onCalendario}
      >
        {calendarioAberto ? <IconeCalendarioCheio /> : <CalendarDays className="size-6" />}
      </Button>
      {menu}
    </>
  );
  const parar = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <>
      {topo && !emEdicao
        ? createPortal(
            // Toques na barra do topo não sobem até o deslize de dia.
            <div
              className="agenda-topo-data w-full"
              onTouchStart={parar}
              onTouchMove={parar}
              onTouchEnd={parar}
              onTouchCancel={parar}
            >
              {topoCelular}
            </div>,
            topo,
          )
        : null}
      <header className="agenda-cabecalho-compacto agenda-cabecalho-unico">
        <h1 className="sr-only">Agenda</h1>
        {celular ? null : (
          <div className="agenda-cabecalho-linha">
            {data}
            {menu}
          </div>
        )}
        <div className={`mt-1 min-w-0 items-center gap-1 ${celular ? "hidden" : "flex"}`}>
          <p className="agenda-resumo-dia min-w-0 flex-1 truncate text-left" aria-live="polite">
            {resumo}
          </p>
          {!ehHoje ? (
            <Button variant="ghost" className="min-h-12 shrink-0 px-3" onClick={onHoje}>
              Hoje
            </Button>
          ) : null}
          {!ocultarSeletor ? (
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
          ) : null}
        </div>
        {children}
      </header>
    </>
  );
}
