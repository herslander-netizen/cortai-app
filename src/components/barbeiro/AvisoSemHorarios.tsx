import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import { getAvisoDeHorarios } from "@/lib/onboarding.functions";

/** Aviso discreto: sem nenhum dia aberto, a agenda online fica fechada para clientes. */
export function AvisoSemHorarios() {
  const buscar = useServerFn(getAvisoDeHorarios);
  const { data } = useQuery({ queryKey: ["aviso-horarios"], queryFn: () => buscar(), staleTime: 5 * 60_000 });
  if (!data?.semHorarioAberto) return null;
  return (
    <div role="status" className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
      <CalendarClock size={18} strokeWidth={1.75} className="shrink-0 text-gold" aria-hidden />
      <span className="min-w-0 flex-1 text-paper">Configure seus horários para abrir a agenda online.</span>
      <Link to="/barbeiro/horarios" className="min-h-12 content-center font-semibold text-paper underline">
        Configurar
      </Link>
    </div>
  );
}
