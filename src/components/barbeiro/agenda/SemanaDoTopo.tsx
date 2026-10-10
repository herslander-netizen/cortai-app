import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { getContagemDoMes } from "@/lib/barbeiro.functions";

import { LETRAS_SEMANA, mesDoDia, numeroDoDia, rotuloDoDia, semanaDoDia } from "./calendario";

/**
 * Faixa da semana no topo da Agenda (celular): domingo a sábado, o dia escolhido num círculo,
 * pontinho nos dias com atendimento e a alça "• • • • •" que abre o mês.
 */
export function SemanaDoTopo({
  dia,
  hoje,
  profissionalId,
  onDia,
  onAbrirMes,
}: {
  dia: string;
  hoje: string;
  profissionalId: string | null;
  onDia: (dia: string) => void;
  onAbrirMes: () => void;
}) {
  const semana = semanaDoDia(dia);
  const meses = [...new Set(semana.map(mesDoDia))];
  const contar = useServerFn(getContagemDoMes);
  const contagens = useQueries({
    queries: meses.map((mes) => ({
      queryKey: ["contagem-do-mes", mes, profissionalId],
      queryFn: () => contar({ data: { mes, profissionalId } }),
      staleTime: 60_000,
    })),
  });
  const total = (d: string) => contagens.reduce((soma, q) => soma + Number(q.data?.[d] ?? 0), 0);

  return (
    <div className="-mx-5">
      <div className="rounded-b-[28px] bg-ink2 px-3 pb-3 pt-1">
        <div className="grid grid-cols-7 text-center text-sm font-medium text-mute" aria-hidden>
          {LETRAS_SEMANA.map((letra, i) => (
            <span key={i} className="py-2">
              {letra}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7" role="group" aria-label="Dias da semana">
          {semana.map((d) => {
            const escolhido = d === dia;
            const temAtendimento = total(d) > 0;
            return (
              <Button
                key={d}
                variant="ghost"
                aria-pressed={escolhido}
                aria-label={`${rotuloDoDia(d)}${d === hoje ? ", hoje" : ""}${temAtendimento ? ", com atendimentos" : ""}`}
                className="h-auto flex-col gap-1 rounded-full px-0 py-1 hover:bg-transparent"
                onClick={() => onDia(d)}
              >
                <span
                  className={`grid size-11 place-items-center rounded-full text-xl ${escolhido ? "bg-menu-icone font-bold text-ink" : d === hoje ? "font-bold text-paper" : "font-medium text-paper"}`}
                >
                  {numeroDoDia(d)}
                </span>
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${temAtendimento ? "bg-rosa" : "bg-transparent"}`}
                />
              </Button>
            );
          })}
        </div>
      </div>
      <Button
        variant="ghost"
        aria-label="Abrir o mês"
        className="mx-auto -mb-3 flex min-h-12 w-full items-center justify-center gap-1.5 hover:bg-transparent"
        onClick={onAbrirMes}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} aria-hidden className="size-1 rounded-full bg-mute2" />
        ))}
      </Button>
    </div>
  );
}
