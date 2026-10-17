import type { PointerEvent as ReactPointerEvent } from "react";

import { AlcaDeDuracao } from "@/components/barbeiro/agenda/AlcaDeDuracao";
import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { nomeDaAgenda } from "@/components/barbeiro/agenda/tempo";

export const PX_POR_MINUTO_PRECISAO = 4;
export const CABECALHO_ZOOM_PX = 30;

export type PosicaoTimeline = {
  inicio: number;
  fim: number;
  topo: number;
  altura: number;
  coluna?: number;
  colunas?: number;
};

type ZoomPrecisaoAgendaProps = {
  itens: AgendaItem[];
  posicoes: Map<string, PosicaoTimeline>;
  idAtivo: string;
  janelaInicio: number;
  janelaFim: number;
  topo: number;
  fuso: string | undefined;
  discreto: boolean;
  deltaInicioMin: number;
  deltaDuracaoMin: number;
  redimensionando: boolean;
  podeRedimensionar: boolean;
  lerRolagem: () => number;
  onTravar: () => void;
  onSoltar: () => void;
  onArrastarDuracao: (dy: number | null) => void;
  onConfirmarDuracao: (item: AgendaItem, deltaMin: number) => void;
  onInicioGesto: (e: ReactPointerEvent<HTMLButtonElement>, item: AgendaItem) => void;
  onMoverGesto: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onFimGesto: (item: AgendaItem) => void;
  onCancelarGesto: () => void;
  onClicarItem: () => void;
};

function minutosNoFuso(valor: string, fuso?: string) {
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

function rotuloHora(minuto: number) {
  const normalizado = ((Math.round(minuto) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalizado / 60)).padStart(2, "0")}:${String(normalizado % 60).padStart(2, "0")}`;
}

function estiloDaColuna(posicao?: PosicaoTimeline) {
  if (posicao?.colunas) {
    return {
      left: `calc(55px + (100% - 59px) * ${posicao.coluna ?? 0} / ${posicao.colunas})`,
      right: "auto",
      width: `calc((100% - 59px) / ${posicao.colunas} - 4px)`,
    };
  }
  return { left: "55px", right: "4px" };
}

/**
 * Lupa temporal apenas visual: a escala ampliada mostra o mesmo horário,
 * em passos de cinco minutos, sem desenhar essa grade pela agenda inteira.
 */
export function ZoomPrecisaoAgenda({
  itens,
  posicoes,
  idAtivo,
  janelaInicio,
  janelaFim,
  topo,
  fuso,
  discreto,
  deltaInicioMin,
  deltaDuracaoMin,
  redimensionando,
  podeRedimensionar,
  lerRolagem,
  onTravar,
  onSoltar,
  onArrastarDuracao,
  onConfirmarDuracao,
  onInicioGesto,
  onMoverGesto,
  onFimGesto,
  onCancelarGesto,
  onClicarItem,
}: ZoomPrecisaoAgendaProps) {
  const ativo = itens.find((item) => item.id === idAtivo);
  if (!ativo) return null;

  const inicioBase = minutosNoFuso(ativo.inicio, fuso);
  const fimBase = minutosNoFuso(ativo.fim, fuso);
  const inicioAtivo = inicioBase + deltaInicioMin;
  const fimAtivo = fimBase + deltaInicioMin + deltaDuracaoMin;
  const alturaRegua = (janelaFim - janelaInicio) * PX_POR_MINUTO_PRECISAO;
  const altura = CABECALHO_ZOOM_PX + alturaRegua;
  const ticks: number[] = [];
  for (let minuto = janelaInicio; minuto <= janelaFim; minuto += 5) ticks.push(minuto);
  const outros = itens
    .filter((item) => item.id !== idAtivo)
    .map((item) => ({
      item,
      inicio: minutosNoFuso(item.inicio, fuso),
      fim: minutosNoFuso(item.fim, fuso),
    }))
    .filter((evento) => evento.inicio < janelaFim && evento.fim > janelaInicio);

  const fimDaAlcaVisivel = fimAtivo >= janelaInicio && fimAtivo <= janelaFim;

  return (
    <div
      className="pointer-events-none absolute z-[8] overflow-hidden rounded-2xl border border-rosa bg-ink shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none"
      role="group"
      aria-label="Ajuste de precisão da agenda"
      style={{
        top: topo,
        left: "-48px",
        right: 0,
        height: altura,
      }}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex h-[30px] items-center justify-between border-b border-line2 bg-ink px-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-paper">
          Ajuste preciso
        </span>
        <span className="rounded-full border border-rosa/50 bg-rosa/10 px-2 py-0.5 text-[10px] font-bold text-paper">
          PASSOS DE 5 MIN
        </span>
      </div>

      <div className="absolute inset-0" aria-hidden="true">
        {ticks.map((minuto) => {
          const principal = minuto % 15 === 0;
          return (
            <div
              key={minuto}
              className={`absolute inset-x-0 h-px ${principal ? "bg-line2" : "border-t border-dashed border-line"}`}
              style={{ top: `${CABECALHO_ZOOM_PX + (minuto - janelaInicio) * PX_POR_MINUTO_PRECISAO}px` }}
            >
              {principal ? (
                <span className="absolute left-1 -top-2 rounded bg-ink px-1 text-[10px] font-semibold tabular-nums text-mute">
                  {rotuloHora(minuto)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {outros.map(({ item, inicio, fim }) => {
        const visivelInicio = Math.max(inicio, janelaInicio);
        const visivelFim = Math.min(fim, janelaFim);
        const alturaEvento = Math.max(22, (visivelFim - visivelInicio) * PX_POR_MINUTO_PRECISAO);
        return (
          <div
            key={item.id}
            aria-hidden="true"
            className="pointer-events-none absolute z-[1] overflow-hidden rounded-lg border border-line bg-ink2/80 px-2 py-1 text-[10px] text-mute"
            style={{
              top: `${CABECALHO_ZOOM_PX + (visivelInicio - janelaInicio) * PX_POR_MINUTO_PRECISAO}px`,
              height: alturaEvento,
              ...estiloDaColuna(posicoes.get(item.id)),
            }}
          >
            <span className="block truncate">{rotuloHora(inicio)} · {nomeDaAgenda(item.cliente, discreto)}</span>
            <span className="block truncate">{item.servico}</span>
          </div>
        );
      })}

      {fimAtivo > janelaInicio && inicioAtivo < janelaFim ? (
        <Button
          type="button"
          variant="ghost"
          data-sem-gesto-dia=""
          aria-label={`Ajuste de precisão: ${nomeDaAgenda(ativo.cliente, discreto)}, ${rotuloHora(inicioAtivo)} a ${rotuloHora(fimAtivo)}. Pressione e arraste para mover em passos de cinco minutos.`}
          className={`agenda-timeline-bloco agenda-timeline-${ativo.status} agenda-timeline-selecionado absolute z-[2] border-rosa shadow-lg`}
          style={{
            top: `${CABECALHO_ZOOM_PX + (Math.max(inicioAtivo, janelaInicio) - janelaInicio) * PX_POR_MINUTO_PRECISAO}px`,
            height: Math.max(28, (Math.min(fimAtivo, janelaFim) - Math.max(inicioAtivo, janelaInicio)) * PX_POR_MINUTO_PRECISAO),
            ...estiloDaColuna(posicoes.get(ativo.id)),
            pointerEvents: "auto",
          }}
          onPointerDown={(e) => onInicioGesto(e, ativo)}
          onPointerMove={onMoverGesto}
          onPointerUp={() => onFimGesto(ativo)}
          onPointerCancel={onCancelarGesto}
          onContextMenu={(e) => e.preventDefault()}
          onClick={onClicarItem}
        >
          <span className="block truncate text-xs font-bold tabular-nums text-paper">
            {rotuloHora(inicioAtivo)} – {rotuloHora(fimAtivo)}
          </span>
          <span className="block truncate text-xs font-semibold text-paper">
            {nomeDaAgenda(ativo.cliente, discreto)}
          </span>
          <span className="block truncate text-[11px] text-mute">{ativo.servico}</span>
          <span className="mt-1 block text-[10px] font-semibold text-paper/80">
            {Math.max(0, fimAtivo - inicioAtivo)} min
          </span>
        </Button>
      ) : null}

      {podeRedimensionar && fimDaAlcaVisivel ? (
        <AlcaDeDuracao
          rotulo={`Esticar a duração de ${nomeDaAgenda(ativo.cliente, discreto)}`}
          etiqueta={redimensionando ? `até ${rotuloHora(fimAtivo)}` : null}
          estilo={{
            top: `${CABECALHO_ZOOM_PX + (fimAtivo - janelaInicio) * PX_POR_MINUTO_PRECISAO - 32}px`,
            pointerEvents: "auto",
            ...estiloDaColuna(posicoes.get(ativo.id)),
          }}
          pxPorMinuto={PX_POR_MINUTO_PRECISAO}
          passoMin={5}
          lerRolagem={lerRolagem}
          onTravar={onTravar}
          onSoltar={onSoltar}
          onArrastar={onArrastarDuracao}
          onConfirmar={(delta) => onConfirmarDuracao(ativo, delta)}
        />
      ) : null}
    </div>
  );
}
