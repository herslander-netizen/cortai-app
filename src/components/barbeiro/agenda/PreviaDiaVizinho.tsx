import { useQuery } from "@tanstack/react-query";
import type { Ref } from "react";

import { EsqueletoAgenda } from "@/components/layout/Esqueleto";

import { dataEditorial, hora, nomeDaAgenda } from "./tempo";
import { opcoesAgendaDia } from "./useAgendaDia";

const ENCERRADOS = new Set(["cancelado", "remarcado"]);

/** Prévia leve e só de leitura do dia que entra pela lateral durante o gesto. */
export function PreviaDiaVizinho({
  dia,
  profissionalId,
  discreto,
  ref,
}: {
  dia: string;
  profissionalId: string | null;
  discreto: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const { data } = useQuery({ ...opcoesAgendaDia(dia), refetchOnMount: false });
  const itens = (data?.itens ?? [])
    .filter((i) => !ENCERRADOS.has(i.status))
    .filter((i) => !profissionalId || i.profissionalId === profissionalId)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  return (
    <div ref={ref} className="agenda-previa-vizinho" aria-hidden="true">
      <strong className="agenda-previa-data">{dataEditorial(dia)}</strong>
      {!data ? (
        <EsqueletoAgenda linhas={4} />
      ) : itens.length === 0 ? (
        <p className="mt-4 text-sm text-mute">Nenhum atendimento</p>
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
