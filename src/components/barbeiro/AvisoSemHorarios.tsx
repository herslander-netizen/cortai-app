import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import { getAvisoDeHorarios } from "@/lib/onboarding.functions";

/** Aviso discreto: sem nenhum dia aberto, a agenda online fica fechada para clientes. */
export function AvisoSemHorarios() {
  const buscar = useServerFn(getAvisoDeHorarios);
  const { data } = useQuery({
    queryKey: ["aviso-horarios"],
    queryFn: () => buscar(),
    staleTime: 5 * 60_000,
  });
  if (!data?.semHorarioAberto) return null;
  return (
    <div
      role="status"
      className="aviso-horarios-compacto mx-3 grid min-h-10 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line px-1 py-1.5 text-xs md:mx-auto md:max-w-[1180px] md:px-4"
    >
      <CalendarClock size={16} strokeWidth={1.75} className="shrink-0 text-gold" aria-hidden />
      <span className="min-w-0 text-mute">Agenda online fechada: defina os horários.</span>
      <Link
        to="/barbeiro/horarios"
        className="shrink-0 font-bold text-paper underline underline-offset-4"
      >
        Definir
      </Link>
    </div>
  );
}
