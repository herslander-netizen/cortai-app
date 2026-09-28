import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Maximize2,
  Menu,
  MessageCircle,
  Scissors,
  Settings,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { sair } from "@/lib/guarda";

type Props = {
  dia: string;
  hoje: boolean;
  fuso?: string;
  agora: number;
  itens: AgendaItem[];
  profissional: string | null;
  profissionais: string[];
  online: boolean;
  ocupado: boolean;
  onDia: (dia: string) => void;
  onProfissional: (nome: string | null) => void;
  onChegou: (item: AgendaItem) => void;
  onComecar: (item: AgendaItem) => void;
  onTerminar: (item: AgendaItem) => void;
  onMaisOpcoes: (item: AgendaItem) => void;
};

function somarDias(dia: string, passo: number) {
  const [ano, mes, data] = dia.split("-").map(Number);
  const base = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, data ?? 1));
  base.setUTCDate(base.getUTCDate() + passo);
  return base.toISOString().slice(0, 10);
}

function hora(iso: string, fuso?: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });
}

function dataCurta(dia: string) {
  return new Date(`${dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).replaceAll(".", "");
}

function minutosAte(iso: string, agora: number) {
  return Math.ceil((new Date(iso).getTime() - agora) / 60_000);
}

export function AgendaFocoMobile(props: Props) {
  const [menu, setMenu] = useState(false);
  const toqueLongo = useRef<number | null>(null);
  const abriuOpcoes = useRef(false);

  const operacionais = props.itens.filter((item) => !["cancelado", "remarcado", "nao_compareceu", "finalizado"].includes(item.status));
  const proximo = operacionais.find((item) => item.status !== "na_cadeira" && new Date(item.inicio).getTime() >= props.agora);
  const emMinutos = proximo ? minutosAte(proximo.inicio, props.agora) : null;

  function iniciarToque(evento: ReactPointerEvent, item: AgendaItem) {
    if (evento.pointerType === "mouse") return;
    abriuOpcoes.current = false;
    toqueLongo.current = window.setTimeout(() => {
      abriuOpcoes.current = true;
      navigator.vibrate?.(10);
      props.onMaisOpcoes(item);
    }, 520);
  }

  function cancelarToque() {
    if (toqueLongo.current !== null) window.clearTimeout(toqueLongo.current);
    toqueLongo.current = null;
  }

  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // No PWA instalado a janela já ocupa a tela; alguns navegadores móveis não expõem esta API.
    }
  }

  return (
    <section className="agenda-foco-mobile" aria-label="Agenda operacional">
      <div className="agenda-foco-topo">
        <Button variant="icon" size="icon" aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu /></Button>
        <div className="min-w-0 text-center">
          <strong className="block truncate text-base font-extrabold capitalize text-paper">{dataCurta(props.dia)}</strong>
          <span className="text-xs font-semibold text-mute">{props.online ? "Ao vivo" : "Sem internet · somente leitura"}</span>
        </div>
        <Button variant="icon" size="icon" aria-label="Usar tela cheia" onClick={() => void alternarTelaCheia()}><Maximize2 /></Button>
      </div>

      {props.hoje && proximo && emMinutos !== null && emMinutos >= 0 && emMinutos <= 30 ? (
        <div className="agenda-foco-aviso" role="status">
          <Bell aria-hidden />
          <span className="min-w-0 truncate">{emMinutos <= 0 ? `Agora: ${proximo.cliente}` : `Próximo em ${emMinutos} min: ${proximo.cliente}`}</span>
        </div>
      ) : null}

      <div className="agenda-foco-dia">
        <Button variant="icon" size="icon" aria-label="Dia anterior" onClick={() => props.onDia(somarDias(props.dia, -1))}><ChevronLeft /></Button>
        <span>{props.hoje ? "Hoje" : dataCurta(props.dia)}</span>
        <Button variant="icon" size="icon" aria-label="Próximo dia" onClick={() => props.onDia(somarDias(props.dia, 1))}><ChevronRight /></Button>
      </div>

      {props.profissionais.length > 1 ? (
        <div className="agenda-foco-profissionais sem-barra" aria-label="Profissional">
          <Button variant="ghost" className={props.profissional === null ? "agenda-chip-ativo" : ""} onClick={() => props.onProfissional(null)}>Todos</Button>
          {props.profissionais.map((nome) => <Button key={nome} variant="ghost" className={props.profissional === nome ? "agenda-chip-ativo" : ""} onClick={() => props.onProfissional(nome)}>{nome}</Button>)}
        </div>
      ) : null}

      <div className="agenda-foco-lista">
        {props.itens.length === 0 ? <div className="agenda-foco-vazio"><Scissors aria-hidden /><strong>Agenda livre</strong><span>Nenhum atendimento neste dia.</span></div> : null}
        {props.itens.map((item) => {
          const ativo = item.status === "na_cadeira";
          const seguinte = proximo?.id === item.id;
          const telefone = item.telefone?.replace(/\D/g, "") ?? "";
          const texto = `Olá, ${item.cliente}! Seu horário na barbearia está chegando. Podemos confirmar sua chegada?`;
          return (
            <article
              key={item.id}
              className={`agenda-foco-item agenda-foco-item-${ativo ? "ativo" : seguinte ? "proximo" : "agendado"}`}
              onPointerDown={(evento) => iniciarToque(evento, item)}
              onPointerUp={cancelarToque}
              onPointerCancel={cancelarToque}
              onPointerLeave={cancelarToque}
              onContextMenu={(evento) => { evento.preventDefault(); props.onMaisOpcoes(item); }}
            >
              <div className="agenda-foco-item-corpo">
                <time dateTime={item.inicio}>{hora(item.inicio, props.fuso)}{ativo ? <span>AGORA</span> : null}</time>
                <h2>{item.cliente}</h2>
                <p>{item.servico}{item.profissional !== "—" ? ` · ${item.profissional}` : ""}</p>
                <StatusBadge status={item.status} label={ativo ? "Em atendimento" : seguinte ? "Próximo" : undefined} />
              </div>
              {!(["cancelado", "remarcado", "nao_compareceu", "finalizado"].includes(item.status)) ? (
                <div className="agenda-foco-acoes" onPointerDown={(evento) => evento.stopPropagation()}>
                  {item.status === "agendado" && telefone ? (
                    <Button asChild variant="outline" disabled={!props.online || props.ocupado}>
                      <a href={`https://wa.me/${telefone.startsWith("55") ? telefone : `55${telefone}`}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer"><MessageCircle />Chamar</a>
                    </Button>
                  ) : null}
                  {item.status === "agendado" ? <Button variant="primary" disabled={!props.online || props.ocupado} onClick={() => props.onChegou(item)}><UserRoundCheck />Chegou</Button> : null}
                  {item.status === "chegou" ? <Button variant="primary" disabled={!props.online || props.ocupado} onClick={() => props.onComecar(item)}><Scissors />Começar</Button> : null}
                  {item.status === "na_cadeira" ? <Button variant="primary" disabled={!props.online || props.ocupado} onClick={() => props.onTerminar(item)}><Check />Terminar</Button> : null}
                </div>
              ) : null}
              <p className="agenda-foco-dica">Segure para remarcar, cancelar ou ver notas</p>
            </article>
          );
        })}
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[82vw] max-w-[320px] border-line bg-ink2 px-5 pt-5">
          <SheetHeader className="pr-10 text-left"><SheetTitle className="text-paper">Menu</SheetTitle><SheetDescription className="text-mute">Acesso rápido da operação.</SheetDescription></SheetHeader>
          <nav className="mt-5 divide-y divide-line">
            <Button asChild variant="ghost" className="agenda-foco-menu-link"><Link to="/barbeiro/conta" onClick={() => setMenu(false)}><UserRound />Perfil</Link></Button>
            <Button asChild variant="ghost" className="agenda-foco-menu-link"><Link to="/barbeiro/configurar" onClick={() => setMenu(false)}><Settings />Configurações</Link></Button>
            <Button variant="ghost" className="agenda-foco-menu-link" onClick={() => void sair()}><LogOut />Sair</Button>
          </nav>
        </SheetContent>
      </Sheet>
    </section>
  );
}