import { useQuery } from "@tanstack/react-query";
import type { Ref } from "react";

import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { EsqueletoAgenda, EsqueletoTimeline } from "@/components/layout/Esqueleto";

import { useVizinhoDoGesto } from "./gesto-dia";
import { dataEditorial, hora, nomeDaAgenda, somarDias } from "./tempo";
import { opcoesAgendaDia } from "./useAgendaDia";

const ENCERRADOS = new Set(["cancelado", "remarcado"]);
const nada = () => {};

export type FormatoDaPrevia = "lista" | "timeline";

/** Prévia só de leitura do dia que entra pela lateral, no mesmo formato da Agenda. */
export function PreviaDiaVizinho({
  dia,
  visualizacao = "lista",
  profissionalId,
  discreto,
  diaCompleto = false,
  ref,
}: {
  dia: string;
  visualizacao?: FormatoDaPrevia;
  profissionalId: string | null;
  discreto: boolean;
  diaCompleto?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const consulta = useQuery({ ...opcoesAgendaDia(dia), refetchOnMount: false });
  const { data } = consulta;
  const itens = (data?.itens ?? [])
    .filter((i) => !ENCERRADOS.has(i.status))
    .filter((i) => !profissionalId || i.profissionalId === profissionalId)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const bloqueios = (data?.bloqueios ?? [])
    .filter((b) => !profissionalId || !b.profissional_id || b.profissional_id === profissionalId)
    .map((b, i) => ({
      id: `previa-${b.profissional_id ?? "equipe"}-${b.inicio}-${b.fim}-${i}`,
      profissionalId: b.profissional_id,
      inicio: b.inicio,
      fim: b.fim,
      motivo: null,
    }));
  const timeline = visualizacao === "timeline";
  return (
    <div ref={ref} className="agenda-previa-vizinho" aria-hidden="true" data-formato={visualizacao}>
      <strong className="agenda-previa-data">{dataEditorial(dia)}</strong>
      {!data ? (
        timeline ? (
          <EsqueletoTimeline onTentarDeNovo={() => void consulta.refetch()} />
        ) : (
          <EsqueletoAgenda linhas={4} onTentarDeNovo={() => void consulta.refetch()} />
        )
      ) : timeline ? (
        <div className="mt-3">
          <AgendaTimeline
            previa
            dia={dia}
            fuso={data.fuso}
            itens={itens}
            bloqueios={bloqueios}
            profissionalId={profissionalId}
            profissionais={data.profissionais ?? []}
            horarios={data.horarios ?? []}
            selecionado={null}
            onSelecionar={nada}
            discreto={discreto}
            diaCompleto={diaCompleto}
          />
        </div>
      ) : itens.length === 0 ? (
        <p className="mt-4 text-sm text-mute">Agenda livre</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {itens.map((i) => (
            <li key={i.id} className="surface grid grid-cols-[56px_minmax(0,1fr)] gap-3 p-3">
              <span className="font-bold tabular-nums">{hora(i.inicio, data.fuso)}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {nomeDaAgenda(i.cliente, discreto)}
                </span>
                <span className="block truncate text-xs text-mute">{i.servico}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Único ponto que redesenha durante o gesto: lê o vizinho do estado externo. */
export function PreviaDoGesto({
  diaAtual,
  ...props
}: {
  diaAtual: string;
  visualizacao?: FormatoDaPrevia;
  profissionalId: string | null;
  discreto: boolean;
  diaCompleto?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const vizinho = useVizinhoDoGesto();
  return vizinho ? <PreviaDiaVizinho dia={somarDias(diaAtual, vizinho)} {...props} /> : null;
}
