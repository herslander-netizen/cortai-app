import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";

type HorarioFuncionamento = {
  diaSemana: number;
  fechado: boolean;
  abre: string;
  fecha: string;
};

type AgendaTimelineProps = {
  dia: string;
  fuso: string | undefined;
  agora: number;
  itens: AgendaItem[];
  horarios: HorarioFuncionamento[];
  selecionado: string | null;
  onSelecionar: (id: string) => void;
  renderStatus: (status: string) => ReactNode;
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

export function AgendaTimeline({ dia, fuso, agora, itens, horarios, selecionado, onSelecionar, renderStatus }: AgendaTimelineProps) {
  const rolagemRef = useRef<HTMLDivElement>(null);
  const linhaAgoraRef = useRef<HTMLDivElement>(null);
  const posicionouRef = useRef<string | null>(null);
  const [agoraVisivel, setAgoraVisivel] = useState(true);
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(agora));
  const ehHoje = dia === hoje;

  const escala = useMemo(() => {
    const funcionamento = horarios.find((item) => item.diaSemana === diaDaSemana(dia) && !item.fechado);
    const inicios = itens.map((item) => minutosNoFuso(item.inicio, fuso));
    const finais = itens.map((item) => minutosNoFuso(item.fim, fuso));
    const minutoAtual = minutosNoFuso(agora, fuso);
    const referenciasInicio = [funcionamento ? minutosDoHorario(funcionamento.abre) : 8 * 60, ...inicios];
    const referenciasFim = [funcionamento ? minutosDoHorario(funcionamento.fecha) : 20 * 60, ...finais];
    if (ehHoje) {
      referenciasInicio.push(minutoAtual - MARGEM_AGORA_MIN);
      referenciasFim.push(minutoAtual + MARGEM_AGORA_MIN);
    }
    const inicio = Math.max(0, Math.floor(Math.min(...referenciasInicio) / 30) * 30);
    const fim = Math.min(24 * 60, Math.ceil(Math.max(...referenciasFim) / 30) * 30);
    return { inicio, fim: Math.max(inicio + 60, fim), minutoAtual };
  }, [agora, dia, ehHoje, fuso, horarios, itens]);

  const marcas = useMemo(() => {
    const resultado: number[] = [];
    for (let minuto = escala.inicio; minuto <= escala.fim; minuto += 30) resultado.push(minuto);
    return resultado;
  }, [escala.fim, escala.inicio]);

  const layout = useMemo(() => {
    const resultado = new Map<string, { inicio: number; fim: number; topo: number; altura: number }>();
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

      grupo.forEach((evento) => {
        const altura = Math.max(ALTURA_MINIMA_BLOCO, (evento.fim - evento.inicio) * PX_POR_MINUTO - 4);
        resultado.set(evento.item.id, { inicio: evento.inicio, fim: evento.fim, topo: cursor, altura });
        cursor += altura + ESPACO_ENTRE_BLOCOS;
      });

      const alturaNatural = (fimGrupo - inicioGrupo) * PX_POR_MINUTO;
      const alturaEmpilhada = cursor - topoNatural - ESPACO_ENTRE_BLOCOS;
      const extra = Math.max(0, alturaEmpilhada - alturaNatural);
      if (extra > 0) {
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
  }, [escala.inicio, fuso, itens]);

  const deslocamentoAte = (minuto: number) => layout.acrescimos.reduce((total, item) => total + (item.depoisDe <= minuto ? item.pixels : 0), 0);
  const altura = (escala.fim - escala.inicio) * PX_POR_MINUTO + layout.pixelsAcrescidos;
  const posicaoAgora = (escala.minutoAtual - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(escala.minutoAtual);

  function voltarParaAgora(comportamento: ScrollBehavior = "smooth") {
    const area = rolagemRef.current;
    const linha = linhaAgoraRef.current;
    if (!area || !linha) return;
    area.scrollTo({ top: Math.max(0, linha.offsetTop - area.clientHeight * 0.42), behavior: comportamento });
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
    const topo = linha.offsetTop;
    setAgoraVisivel(topo >= area.scrollTop && topo <= area.scrollTop + area.clientHeight);
  }

  return (
    <div className="agenda-timeline-wrap">
      {ehHoje && !agoraVisivel ? (
        <Button type="button" variant="secondary" size="sm" className="agenda-voltar-agora" onClick={() => voltarParaAgora()}>
          <Clock3 aria-hidden />
          Voltar para agora
        </Button>
      ) : null}
      <div ref={rolagemRef} className="agenda-timeline-scroll" aria-label="Timeline de atendimentos" onScroll={acompanharAgora}>
        <div className="agenda-timeline" style={{ height: `${altura}px` }}>
          {marcas.map((minuto) => (
            <div key={minuto} className={`agenda-timeline-marca ${minuto % 60 === 0 ? "agenda-timeline-hora" : ""}`} style={{ top: `${(minuto - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(minuto)}px` }}>
              <span>{minuto % 60 === 0 ? horaMinuto(minuto) : ""}</span>
            </div>
          ))}

          {itens.map((item) => {
            const posicao = layout.posicoes.get(item.id);
            const inicio = posicao?.inicio ?? minutosNoFuso(item.inicio, fuso);
            const fim = minutosNoFuso(item.fim, fuso);
            const topo = posicao?.topo ?? (inicio - escala.inicio) * PX_POR_MINUTO + deslocamentoAte(inicio);
            const blocoAltura = posicao?.altura ?? Math.max(ALTURA_MINIMA_BLOCO, (Math.max(inicio + 1, fim) - inicio) * PX_POR_MINUTO - 4);
            const reais = [
              horaReal(item.arrivedAt, fuso) ? `Chegou ${horaReal(item.arrivedAt, fuso)}` : null,
              horaReal(item.startedAt, fuso) ? `Começou ${horaReal(item.startedAt, fuso)}` : null,
              horaReal(item.finishedAt, fuso) ? `Terminou ${horaReal(item.finishedAt, fuso)}` : null,
            ].filter(Boolean).join(" · ");
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className={`agenda-timeline-bloco agenda-timeline-${item.status} ${selecionado === item.id ? "agenda-timeline-selecionado" : ""}`}
                style={{ top: `${topo}px`, minHeight: `${blocoAltura}px` }}
                aria-pressed={selecionado === item.id}
                onClick={() => onSelecionar(item.id)}
              >
                <span className="agenda-timeline-bloco-topo">
                  <strong>{horaMinuto(inicio)} · {item.cliente}</strong>
                  {renderStatus(item.status)}
                </span>
                <span className="agenda-timeline-servico">{item.servico} · {item.profissional}</span>
                {reais ? <span className="agenda-timeline-reais">{reais}</span> : null}
              </Button>
            );
          })}

          {ehHoje && posicaoAgora >= 0 && posicaoAgora <= altura ? (
            <div ref={linhaAgoraRef} className="agenda-linha-agora" style={{ top: `${posicaoAgora}px` }} aria-label={`Agora, ${horaMinuto(escala.minutoAtual)}`}>
              <span>Agora · {horaMinuto(escala.minutoAtual)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}