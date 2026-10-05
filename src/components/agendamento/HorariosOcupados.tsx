import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { HorarioComEstado } from "@/lib/disponibilidade";
import { cn } from "@/lib/utils";

/**
 * Horários ocupados para o cliente: aparecem, mas nunca podem ser escolhidos
 * para agendar. Tocar oferece só a lista de espera daquele horário (sem reserva).
 * Nunca mostra quem ocupa.
 */
export function HorariosOcupados({
  ocupados,
  dia,
  servicoId,
  slug,
  listaDeEspera,
}: {
  ocupados: HorarioComEstado[];
  dia: string;
  servicoId: string;
  slug?: string | undefined;
  listaDeEspera: boolean;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  if (!ocupados.length) return null;
  const escolhido = ocupados.find((o) => o.iso === aberto) ?? null;
  return (
    <div className="mt-3">
      <p className="text-xs text-mute2">Ocupados</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Horários ocupados">
        {ocupados.map((o) => (
          <button
            key={o.iso}
            type="button"
            aria-disabled="true"
            aria-label={`${o.label}, ocupado${listaDeEspera ? ". Tocar para entrar na lista de espera" : ""}`}
            onClick={() => listaDeEspera && setAberto(aberto === o.iso ? null : o.iso)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-lg border border-dashed px-3 py-1 text-sm",
              aberto === o.iso ? "border-brick text-paper" : "border-line text-mute2",
              !listaDeEspera && "cursor-not-allowed",
            )}
          >
            <span className="font-semibold">{o.label}</span>
            <span className="text-xs text-brick">Ocupado</span>
          </button>
        ))}
      </div>
      {escolhido && listaDeEspera ? (
        <div className="mt-3 rounded-xl border border-line px-4 py-3 text-sm">
          <p className="text-paper">{escolhido.label} está ocupado.</p>
          <p className="mt-1 text-mute">
            Entre na lista de espera desse horário. Se vagar, avisamos — sem reservar nada antes de
            você confirmar.
          </p>
          <Link
            to="/app/espera"
            search={{
              ...(slug ? { b: slug } : {}),
              servico: servicoId,
              dia,
              horario: escolhido.label,
            }}
            className="btn-primary mt-3 inline-flex w-full justify-center px-5 py-3"
          >
            Quero esse horário
          </Link>
        </div>
      ) : null}
    </div>
  );
}
