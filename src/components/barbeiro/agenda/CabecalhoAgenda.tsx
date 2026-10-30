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
  Search,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import { buscaDaLista, useBuscaDaLista } from "./busca-da-lista";
import { MOLA } from "@/lib/movimento-figaro";

export type VisualizacaoAgenda = "lista" | "timeline" | "semana";

function paraData(dia: string) {
  const [a = 1970, m = 1, d = 1] = dia.split("-").map(Number);
  return new Date(a, m - 1, d);
}
function deData(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

/** Painel de busca: nasce no lugar da lupa e corre para a esquerda até cobrir a barra do topo. */
function PainelDeBusca() {
  const { texto } = useBuscaDaLista();
  return (
    <motion.div
      role="search"
      initial={{ width: 56, opacity: 0 }}
      animate={{ width: "100%", opacity: 1 }}
      exit={{ width: 56, opacity: 0 }}
      transition={MOLA.tamanho}
      className="absolute inset-y-0 right-0 z-10 flex items-center gap-2 overflow-hidden rounded-full bg-[var(--agenda-cartao,var(--ink2))] pl-4 pr-1"
    >
      <Search aria-hidden className="size-5 shrink-0 text-mute" />
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        // `text` + `inputMode="search"`: mantém a tecla de busca e evita o "x" nativo, que duplicava o botão de fechar.
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={texto}
        onChange={(e) => buscaDaLista.texto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") buscaDaLista.fechar();
        }}
        placeholder="Buscar cliente, telefone ou serviço"
        aria-label="Buscar atendimento"
        className="h-12 min-w-0 flex-1 bg-transparent text-base text-paper outline-none placeholder:text-mute"
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Fechar busca"
        className="size-12 shrink-0 rounded-full text-mute"
        onClick={buscaDaLista.fechar}
      >
        <X aria-hidden />
      </Button>
    </motion.div>
  );
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
  // Na lista do celular o calendário não serve: o mesmo botão vira lupa e abre a busca para o lado esquerdo.
  const modoBusca = celular && visualizacao === "lista";
  const busca = useBuscaDaLista();
  useEffect(() => {
    if (!modoBusca) buscaDaLista.fechar();
  }, [modoBusca]);
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
        <PopoverContent align="start" className="w-auto border-line bg-ink3 p-2">
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
          className="ml-auto [&>svg]:size-6"
          aria-label="Desativar modo discreto"
          onClick={onDiscreto}
        >
          <EyeOff />
        </Button>
      ) : null}
      {/* No celular, as opções da agenda estão desativadas por ora (Modo Foco, Fila e Ajuda). */}
      {celular ? null : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mais opções da agenda"
              className={`relative ${discreto ? "" : "ml-auto"} ${celular ? "w-9 min-w-9" : ""}`}
            >
              {celular ? (
                <MoreVertical className="size-6" />
              ) : (
                <MoreHorizontal className="size-6" />
              )}
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
      )}
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
      >
        <span className="truncate text-[22px] leading-7 text-paper" style={{ fontFamily: "var(--figaro-font-body)" }}>
          <strong className="font-bold">
            {(tituloCelular ?? tituloDoMes(dia)).split(" ")[0]}
          </strong>{" "}
          <span className="font-medium">{(tituloCelular ?? tituloDoMes(dia)).split(" ")[1]}</span>
        </span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 min-w-12 shrink-0 rounded-xl text-[var(--figaro-on-surface-variant,var(--mute))] transition-transform duration-[200ms] hover:bg-transparent hover:text-[var(--figaro-on-surface-variant,var(--mute))] motion-reduce:transition-none"
        aria-label={
          modoBusca
            ? "Buscar atendimento"
            : calendarioAberto
              ? "Recolher calendário"
              : "Abrir calendário"
        }
        aria-pressed={modoBusca ? busca.aberta : calendarioAberto}
        onClick={modoBusca ? buscaDaLista.abrir : onCalendario}
      >
        <AnimatePresence initial={false} mode="wait">
          {modoBusca ? (
            <motion.span
              key="lupa"
              initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
              transition={MOLA.rapidaEspacial}
              className="inline-flex"
            >
              <Search
                className="size-9 text-[var(--figaro-on-surface-variant,var(--mute))]"
                strokeWidth={1.8}
                aria-hidden
              />
            </motion.span>
          ) : (
            <motion.span
              key="calendario"
              initial={{ opacity: 0, scale: 0.6, rotate: 45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: -45 }}
              transition={MOLA.rapidaEspacial}
              className="inline-flex"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                // Figaro: caixa de 32 (≈25×27 dp desenhados, medidos na captura do dono, 30/10), cheio e em azul quando
                // o mês está aberto, sem girar. Fechado, na cor do sino ao lado. Traço afinado na proporção para manter
                // a mesma espessura na tela.
                className={`!size-8 transition-colors duration-[200ms] motion-reduce:transition-none ${
                  calendarioAberto
                    ? "text-primary"
                    : "text-[var(--figaro-on-surface-variant,var(--mute))]"
                }`}
              >
                <path
                  d="M7.5 3.5v3 M16.5 3.5v3"
                  stroke="currentColor"
                  strokeWidth="1.95"
                  strokeLinecap="round"
                />
                <rect
                  x="3.5"
                  y="6.2"
                  width="17"
                  height="15.3"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth={calendarioAberto ? 1.6 : 1.5}
                  fill={calendarioAberto ? "currentColor" : "none"}
                />
                <rect
                  x="7.2"
                  y="10.2"
                  width="4.6"
                  height="4.6"
                  rx="0.8"
                  stroke={calendarioAberto ? "var(--ink)" : "currentColor"}
                  strokeWidth={calendarioAberto ? 1.6 : 1.5}
                  fill={calendarioAberto ? "var(--ink)" : "none"}
                />
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
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
              className="agenda-topo-data relative w-full"
              onTouchStart={parar}
              onTouchMove={parar}
              onTouchEnd={parar}
              onTouchCancel={parar}
            >
              {topoCelular}
              <AnimatePresence initial={false}>
                {modoBusca && busca.aberta ? <PainelDeBusca /> : null}
              </AnimatePresence>
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
