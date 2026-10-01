import { Check, Clock3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type React from "react";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/useAgora";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { estaAtrasado, intervaloDoDia } from "@/components/barbeiro/agenda/tempo";
import { nomeDaAgenda } from "@/components/barbeiro/agenda/tempo";

type HorarioFuncionamento = {
  diaSemana: number;
  fechado: boolean;
  abre: string;
  fecha: string;
  intervaloInicio?: string | null;
  intervaloFim?: string | null;
};

type AgendaTimelineProps = {
  dia: string;
  fuso: string | undefined;
  agora?: number;
  itens: AgendaItem[];
  horarios: HorarioFuncionamento[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
  /** Mantido por compatibilidade; a timeline mostra só estados especiais. */
  renderStatus?: (status: string) => ReactNode;
  onMover?: (item: AgendaItem, deltaMin: number) => void;
  onHorarioVazio?: (horaMin: string) => void;
  destaques?: Set<string>;
  itensEscala?: AgendaItem[];
  alinhado?: boolean;
  mostrarProfissional?: boolean;
  discreto?: boolean;
};

const PX_POR_MINUTO = 1.6;
const MARGEM_AGORA_MIN = 90;
const ALTURA_MINIMA_BLOCO = 72;
const ESPACO_ENTRE_BLOCOS = 6;

function minutosDoHorario(valor: string) {
  const [hora = 0, minuto = 0] = valor.split(":").map(Number);
  return hora * 60 + minuto;
}

function minutosNoFuso(valor: string | number, fuso?: string) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fuso,
  }).formatToParts(new Date(valor));
  const hora = Number(partes.find((parte) => parte.type === "hour")?.value ?? 0);
  const minuto = Number(partes.find((parte) => parte.type === "minute")?.value ?? 0);
  return hora * 60 + minuto;
}

function horaMinuto(total: number) {
  const normalizado = Math.max(0, Math.min(24 * 60, total));
  const hora = Math.floor(normalizado / 60);
  const minuto = normalizado % 60;
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

function horaReal(valor: string | null, fuso?: string) {
  return valor ? horaMinuto(minutosNoFuso(valor, fuso)) : null;
}

function diaDaSemana(dia: string) {
  return new Date(`${dia}T12:00:00Z`).getUTCDay();
}

export function AgendaTimeline({
  dia,
  fuso,
  agora: agoraProp,
  itens,
  horarios,
  selecionado,
  onSelecionar,
  onMover,
  onHorarioVazio,
  destaques,
  itensEscala,
  alinhado,
  mostrarProfissional = false,
  discreto = false,
}: AgendaTimelineProps) {
  const relogio = useAgora();
  const agora = agoraProp ?? relogio;
  const [toqueVazio, setToqueVazio] = useState<number | null>(null);
  const rolagemRef = useRef<HTMLDivElement>(null);
  const linhaAgoraRef = useRef<HTMLDivElement>(null);
  const posicionouRef = useRef<string | null>(null);
  const [agoraVisivel, setAgoraVisivel] = useState(true);
  const [arrasto, setArrasto] = useState<{ id: string; dy: number } | null>(null);
  const gesto = useRef<{
    id: string;
    y0: number;
    x0: number;
    ativo: boolean;
    timer?: number;
    arrastou: boolean;
  } | null>(null);
  const ignorarClique = useRef(false);
  const gestoVazio = useRef<{ x: number; y: number; moveu: boolean } | null>(null);
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(agora));
  const ehHoje = dia === hoje;

  const escala = useMemo(() => {
    const funcionamento = horarios.find(
      (item) => item.diaSemana === diaDaSemana(dia) && !item.fechado,
    );
    const base = itensEscala ?? itens;
    const inicios = base.map((item) => minutosNoFuso(item.inicio, fuso));
    const finais = base.map((item) => minutosNoFuso(item.fim, fuso));
    const minutoAtual = minutosNoFuso(agora, fuso);
    const referenciasInicio = [
      funcionamento ? minutosDoHorario(funcionamento.abre) : 8 * 60,
      ...inicios,
    ];
    const referenciasFim = [
      funcionamento ? minutosDoHorario(funcionamento.fecha) : 20 * 60,
      ...finais,
    ];
    if (ehHoje) {
      referenciasInicio.push(minutoAtual - MARGEM_AGORA_MIN);
      referenciasFim.push(minutoAtual + MARGEM_AGORA_MIN);
    }
    const inicio = Math.max(0, Math.floor(Math.min(...referenciasInicio) / 30) * 30);
    const fim = Math.min(24 * 60, Math.ceil(Math.max(...referenciasFim) / 30) * 30);
    return { inicio, fim: Math.max(inicio + 60, fim), minutoAtual };
  }, [agora, dia, ehHoje, fuso, horarios, itens, itensEscala]);

  const marcas = useMemo(() => {
    const resultado: number[] = [];
    for (let minuto = escala.inicio; minuto <= escala.fim; minuto += 30) resultado.push(minuto);
    return resultado;
  }, [escala.fim, escala.inicio]);

  const layout = useMemo(() => {
    const resultado = new Map<
      string,
      {
        inicio: number;
        fim: number;
        topo: number;
        altura: number;
        coluna?: number;
        colunas?: number;
      }
    >();
    const acrescimos: Array<{ depoisDe: number; pixels: number }> = [];
    const ordenados = itens
      .map((item) => {
        const inicio = minutosNoFuso(item.inicio, fuso);
        return { item, inicio, fim: Math.max(inicio + 30, minutosNoFuso(item.fim, fuso)) };
      })
      .sort((a, b) => a.inicio - b.inicio);
    let grupo: typeof ordenados = [];
    let fimDoGrupo = -1;
    let pixelsAcrescidos = 0;
    const distribuir = () => {
      const inicioGrupo = Math.min(...grupo.map((evento) => evento.inicio));
      const fimGrupo = Math.max(...grupo.map((evento) => evento.fim));
      const topoNatural = (inicioGrupo - escala.inicio) * PX_POR_MINUTO + pixelsAcrescidos;
      let cursor = topoNatural;

      // Encaixe sobreposto aparece lado a lado, no horário real.
      if (grupo.length > 1 && (alinhado || grupo.some((evento) => evento.item.encaixe))) {
        const colunas = Math.min(grupo.length, 3);
        grupo.forEach((evento, i) => {
          const altura = alinhado
            ? Math.max(44, (evento.fim - evento.inicio) * PX_POR_MINUTO - 4)
            : Math.max(ALTURA_MINIMA_BLOCO, (evento.fim - evento.inicio) * PX_POR_MINUTO - 4);
          const topo = (evento.inicio - escala.inicio) * PX_POR_MINUTO + pixelsAcrescidos;
          resultado.set(evento.item.id, {
            inicio: evento.inicio,
            fim: evento.fim,
            topo,
            altura,
            coluna: i % colunas,
            colunas,
          });
          cursor = Math.max(cursor, topo + altura + ESPACO_ENTRE_BLOCOS);
        });
      } else {
        grupo.forEach((evento) => {
          if (alinhado) {
            const topo = (evento.inicio - escala.inicio) * PX_POR_MINUTO;
            const altura = Math.max(44, (evento.fim - evento.inicio) * PX_POR_MINUTO - 4);
            resultado.set(evento.item.id, { inicio: evento.inicio, fim: evento.fim, topo, altura });
            cursor = topo + altura + ESPACO_ENTRE_BLOCOS;
            return;
          }
          const altura = Math.max(
            ALTURA_MINIMA_BLOCO,
            (evento.fim - evento.inicio) * PX_POR_MINUTO - 4,
          );
          resultado.set(evento.item.id, {
            inicio: evento.inicio,
            fim: evento.fim,
            topo: cursor,
            altura,
          });
          cursor += altura + ESPACO_ENTRE_BLOCOS;
        });
      }

      const alturaNatural = (fimGrupo - inicioGrupo) * PX_POR_MINUTO;
      const alturaEmpilhada = cursor - topoNatural - ESPACO_ENTRE_BLOCOS;
      const extra = Math.max(0, alturaEmpilhada - alturaNatural);
      if (extra > 0 && !alinhado) {
        pixelsAcrescidos += extra;
        acrescimos.push({ depoisDe: fimGrupo, pixels: extra });
      }
    };
    ordenados.forEach((evento) => {
      if (grupo.length > 0 && evento.inicio >= fimDoGrupo) {
        distribuir();
        grupo = [];
        fimDoGrupo = -1;
      }
      grupo.push(evento);
      fimDoGrupo = Math.max(fimDoGrupo, evento.fim);
    });
    if (grupo.length > 0) distribuir();
    return { posicoes: resultado, acrescimos, pixelsAcrescidos };
  }, [alinhado, escala.inicio, fuso, itens]);

  const deslocamentoAte = (minuto: number) =>
    layout.acrescimos.reduce(
      (total, item) => total + (item.depoisDe <= minuto ? item.pixels : 0),
      0,
    );
  const altura = (escala.fim - escala.inicio) * PX_POR_MINUTO + layout.pixelsAcrescidos;
  const posicaoAgora =
    (escala.minutoAtual - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(escala.minutoAtual);

  function voltarParaAgora(comportamento: ScrollBehavior = "smooth") {
    const area = rolagemRef.current;
    const linha = linhaAgoraRef.current;
    if (!area || !linha) return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      linha.scrollIntoView({ behavior: comportamento, block: "center" });
      return;
    }
    area.scrollTo({
      top: Math.max(0, linha.offsetTop - area.clientHeight * 0.42),
      behavior: comportamento,
    });
  }

  useEffect(() => {
    if (!ehHoje || posicionouRef.current === dia) return;
    const quadro = window.requestAnimationFrame(() => {
      voltarParaAgora("auto");
      posicionouRef.current = dia;
    });
    return () => window.cancelAnimationFrame(quadro);
  }, [dia, ehHoje, altura]);

  function acompanharAgora() {
    const area = rolagemRef.current;
    const linha = linhaAgoraRef.current;
    if (!area || !linha || !ehHoje) {
      setAgoraVisivel(true);
      return;
    }
    if (window.matchMedia("(max-width: 767px)").matches) {
      const caixa = linha.getBoundingClientRect();
      setAgoraVisivel(caixa.top >= 0 && caixa.bottom <= window.innerHeight);
      return;
    }
    const topo = linha.offsetTop;
    setAgoraVisivel(topo >= area.scrollTop && topo <= area.scrollTop + area.clientHeight);
  }

  useEffect(() => {
    if (!ehHoje) return;
    const acompanhar = () => {
      const area = rolagemRef.current;
      const linha = linhaAgoraRef.current;
      if (!area || !linha) return;
      if (window.matchMedia("(max-width: 767px)").matches) {
        const caixa = linha.getBoundingClientRect();
        setAgoraVisivel(caixa.top >= 0 && caixa.bottom <= window.innerHeight);
        return;
      }
      const topo = linha.offsetTop;
      setAgoraVisivel(topo >= area.scrollTop && topo <= area.scrollTop + area.clientHeight);
    };
    window.addEventListener("scroll", acompanhar, { passive: true });
    window.addEventListener("resize", acompanhar);
    acompanhar();
    return () => {
      window.removeEventListener("scroll", acompanhar);
      window.removeEventListener("resize", acompanhar);
    };
  }, [ehHoje, altura]);

  const podeMover = (item: AgendaItem) =>
    Boolean(onMover) && (item.status === "agendado" || item.status === "chegou");

  function inicioGesto(e: React.PointerEvent, item: AgendaItem) {
    if (!podeMover(item)) return;
    const g = {
      id: item.id,
      y0: e.clientY,
      x0: e.clientX,
      ativo: e.pointerType === "mouse",
      arrastou: false,
    } as NonNullable<typeof gesto.current>;
    const alvo = e.currentTarget as HTMLElement;
    const pid = e.pointerId;
    if (e.pointerType !== "mouse") {
      g.timer = window.setTimeout(() => {
        g.ativo = true;
        try {
          alvo.setPointerCapture(pid);
        } catch {
          /* */
        }
        setArrasto({ id: item.id, dy: 0 });
        navigator.vibrate?.(10);
      }, 400);
    }
    gesto.current = g;
  }
  function moverGesto(e: React.PointerEvent) {
    const g = gesto.current;
    if (!g) return;
    const dy = e.clientY - g.y0;
    if (!g.ativo) {
      if (Math.abs(dy) > 8 || Math.abs(e.clientX - g.x0) > 8) {
        window.clearTimeout(g.timer);
        gesto.current = null;
      }
      return;
    }
    if (!g.arrastou && Math.abs(dy) < 5) return;
    if (!g.arrastou) {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
    g.arrastou = true;
    e.preventDefault();
    setArrasto({ id: g.id, dy });
  }
  function fimGesto(item: AgendaItem) {
    const g = gesto.current;
    gesto.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    const dy = arrasto?.id === item.id ? arrasto.dy : 0;
    setArrasto(null);
    if (!g.arrastou) return;
    ignorarClique.current = true;
    const delta = Math.round(dy / PX_POR_MINUTO / 15) * 15;
    if (delta !== 0) {
      navigator.vibrate?.(18);
      onMover?.(item, delta);
    }
  }
  function cliqueNoVazio(e: React.MouseEvent<HTMLDivElement>) {
    if (!onHorarioVazio || e.target !== e.currentTarget) return;
    if (gestoVazio.current?.moveu) {
      gestoVazio.current = null;
      return;
    }
    gestoVazio.current = null;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    let minuto = escala.inicio + y / PX_POR_MINUTO;
    minuto -= deslocamentoAte(minuto) / PX_POR_MINUTO;
    const arredondado = Math.floor(minuto / 15) * 15;
    if (intervalo && arredondado >= intervalo[0] && arredondado < intervalo[1]) return;
    setToqueVazio(arredondado);
    window.setTimeout(() => {
      setToqueVazio(null);
      onHorarioVazio(horaMinuto(arredondado));
    }, 160);
  }
  const intervalo = intervaloDoDia(horarios, dia);

  return (
    <div className="agenda-timeline-wrap">
      {ehHoje && !agoraVisivel ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="agenda-voltar-agora"
          onClick={() => voltarParaAgora()}
        >
          <Clock3 aria-hidden />
          Voltar para agora
        </Button>
      ) : null}
      <div
        ref={rolagemRef}
        className="agenda-timeline-scroll"
        aria-label="Timeline de atendimentos"
        onScroll={acompanharAgora}
      >
        <div
          className="agenda-timeline"
          style={{ height: `${altura}px` }}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            gestoVazio.current = { x: e.clientX, y: e.clientY, moveu: false };
          }}
          onPointerMove={(e) => {
            const g = gestoVazio.current;
            if (!g) return;
            if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) g.moveu = true;
          }}
          onPointerCancel={() => {
            gestoVazio.current = null;
          }}
          onClick={cliqueNoVazio}
        >
          {intervalo ? (
            <div
              className="agenda-timeline-intervalo"
              style={{
                top: `${(intervalo[0] - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(intervalo[0])}px`,
                height: `${(intervalo[1] - intervalo[0]) * PX_POR_MINUTO}px`,
              }}
              aria-hidden
            >
              <span>Intervalo</span>
            </div>
          ) : null}
          {toqueVazio !== null ? (
            <div
              className="agenda-timeline-toque"
              style={{
                top: `${(toqueVazio - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(toqueVazio)}px`,
              }}
              aria-hidden
            >
              + {horaMinuto(toqueVazio)}
            </div>
          ) : null}
          {marcas.map((minuto) => (
            <div
              key={minuto}
              className={`agenda-timeline-marca ${minuto % 60 === 0 ? "agenda-timeline-hora" : ""}`}
              style={{
                top: `${(minuto - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(minuto)}px`,
              }}
            >
              <span>{minuto % 60 === 0 ? horaMinuto(minuto) : ""}</span>
            </div>
          ))}

          {itens.map((item) => {
            const nome = nomeDaAgenda(item.cliente, discreto);
            const posicao = layout.posicoes.get(item.id);
            const inicio = posicao?.inicio ?? minutosNoFuso(item.inicio, fuso);
            const fim = minutosNoFuso(item.fim, fuso);
            const topo =
              posicao?.topo ?? (inicio - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(inicio);
            const blocoAltura =
              posicao?.altura ??
              Math.max(
                ALTURA_MINIMA_BLOCO,
                (Math.max(inicio + 1, fim) - inicio) * PX_POR_MINUTO - 4,
              );
            const reais = [
              horaReal(item.arrivedAt, fuso) ? `Chegou ${horaReal(item.arrivedAt, fuso)}` : null,
              horaReal(item.startedAt, fuso) ? `Começou ${horaReal(item.startedAt, fuso)}` : null,
              horaReal(item.finishedAt, fuso)
                ? `Terminou ${horaReal(item.finishedAt, fuso)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                aria-label={`${horaMinuto(inicio)}, ${nome}, ${item.servico}, ${item.status.replace("_", " ")}`}
                className={`agenda-timeline-bloco agenda-timeline-${item.status} ${ehHoje && minutosNoFuso(item.fim, fuso) < escala.minutoAtual ? "agenda-timeline-passado" : ""} ${item.encaixe ? "agenda-timeline-encaixe" : ""} ${selecionado === item.id ? "agenda-timeline-selecionado" : ""} ${destaques?.has(item.id) ? "agenda-novo" : ""} ${arrasto?.id === item.id ? "agenda-arrastando" : ""}`}
                style={{
                  top: `${topo}px`,
                  minHeight: `${blocoAltura}px`,
                  ...(posicao?.colunas
                    ? {
                        left: `calc(7px + (100% - 11px) * ${posicao.coluna ?? 0} / ${posicao.colunas})`,
                        right: "auto",
                        width: `calc((100% - 11px) / ${posicao.colunas} - 4px)`,
                      }
                    : {}),
                  ...(arrasto?.id === item.id
                    ? { transform: `translateY(${arrasto.dy}px) scale(1.02)` }
                    : {}),
                }}
                aria-pressed={selecionado === item.id}
                onPointerDown={(e) => inicioGesto(e, item)}
                onPointerMove={moverGesto}
                onPointerUp={() => fimGesto(item)}
                onPointerCancel={() => {
                  if (gesto.current) window.clearTimeout(gesto.current.timer);
                  gesto.current = null;
                  setArrasto(null);
                }}
                onContextMenu={(e) => {
                  if (podeMover(item)) e.preventDefault();
                }}
                onClick={() => {
                  if (ignorarClique.current) {
                    ignorarClique.current = false;
                    return;
                  }
                  onSelecionar(item.id);
                }}
              >
                <span className="agenda-timeline-bloco-topo">
                  <strong className="col-span-2">
                    {horaMinuto(
                      arrasto?.id === item.id
                        ? inicio + Math.round(arrasto.dy / PX_POR_MINUTO / 15) * 15
                        : inicio,
                    )}{" "}
                    · {nome}
                  </strong>
                </span>
                <span className="flex min-w-0 items-center gap-1">
                  <span className="agenda-timeline-servico min-w-0 flex-1">
                    {item.servico}
                    {mostrarProfissional ? ` · ${item.profissional}` : ""}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {item.status === "finalizado" ? (
                      <Check className="agenda-check-finalizado" aria-label="Finalizado" />
                    ) : null}
                    {item.status === "na_cadeira" ? <StatusBadge status="na_cadeira" /> : null}
                    {ehHoje && estaAtrasado(item, agora) ? <StatusBadge status="atrasado" /> : null}
                    {item.encaixe ? <StatusBadge status="encaixe" /> : null}
                    {item.confirmadoEm && item.status === "agendado" ? (
                      <StatusBadge status="confirmado" label="Confirmou" />
                    ) : null}
                  </span>
                </span>
                {item.daListaDeEspera ? (
                  <span className="agenda-timeline-fila">Vaga preenchida pela lista de espera</span>
                ) : null}
                {reais ? <span className="agenda-timeline-reais">{reais}</span> : null}
              </Button>
            );
          })}

          {ehHoje && posicaoAgora >= 0 && posicaoAgora <= altura ? (
            <div
              ref={linhaAgoraRef}
              className="agenda-linha-agora"
              style={{ transform: `translateY(${posicaoAgora}px)` }}
              aria-label={`Agora, ${horaMinuto(escala.minutoAtual)}`}
            >
              <span>{horaMinuto(escala.minutoAtual)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
