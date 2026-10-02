import { useQueries } from "@tanstack/react-query";

import { StatusBadge } from "@/components/ui/badge";
import { getAgendaDia, type AgendaDia } from "@/lib/barbeiro.functions";

const INATIVOS = new Set(["cancelado", "remarcado", "nao_compareceu"]);

/** Visão Semana (desktop): sete colunas compactas; tocar num dia abre o Dia. */
export function AgendaSemana({
  semana,
  fuso,
  hoje,
  profissional,
  onAbrirDia,
}: {
  semana: string[];
  fuso: string | undefined;
  hoje: string;
  profissional: string | null;
  onAbrirDia: (dia: string) => void;
}) {
  // Mesma chave da visão Dia: reaproveita o cache e o tempo real existentes.
  const dias = useQueries({
    queries: semana.map((d) => ({
      queryKey: ["agenda-dia", d],
      queryFn: () => getAgendaDia({ data: { dia: d } }) as Promise<AgendaDia>,
      staleTime: 60_000,
    })),
  });
  const hora = (v: string) =>
    new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });

  return (
    <div className="agenda-semana-grade" role="grid" aria-label="Semana">
      {semana.map((d, i) => {
        const itens = (dias[i]?.data?.itens ?? [])
          .filter((it) => !profissional || it.profissional === profissional)
          .filter((it) => !INATIVOS.has(it.status))
          .sort((a, b) => a.inicio.localeCompare(b.inicio));
        const data = new Date(`${d}T12:00:00Z`);
        return (
          <section key={d} className="agenda-semana-coluna" data-hoje={d === hoje}>
            <button
              type="button"
              className="agenda-semana-coluna-topo"
              onClick={() => onAbrirDia(d)}
            >
              <span>
                {data
                  .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
                  .replace(".", "")}
              </span>
              <strong>{data.getUTCDate()}</strong>
              <small>
                {dias[i]?.isLoading
                  ? "…"
                  : `${itens.length} ${itens.length === 1 ? "agendado" : "agendados"}`}
              </small>
            </button>
            <ul>
              {itens.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    className={`agenda-semana-item agenda-timeline-${it.status} ${it.encaixe ? "agenda-timeline-encaixe" : ""}`}
                    onClick={() => onAbrirDia(d)}
                  >
                    <strong>
                      {hora(it.inicio)} · {it.cliente}
                    </strong>
                    <span>{it.servico}</span>
                    <StatusBadge status={it.status} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
