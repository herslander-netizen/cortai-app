import { Clock3 } from "lucide-react";
import { statusDeFuncionamento } from "@/lib/status-funcionamento";
import type { ExcecaoIntervaloAgenda, HorarioDeFuncionamento } from "@/lib/horarios";

export function StatusFuncionamento({
  horarios,
  fuso,
  excecoesIntervalo = [],
}: {
  horarios: HorarioDeFuncionamento[];
  fuso: string;
  excecoesIntervalo?: ExcecaoIntervaloAgenda[];
}) {
  const status = statusDeFuncionamento(horarios, fuso, undefined, excecoesIntervalo);
  if (!status) return null;
  return (
    <p className="flex min-h-12 items-center gap-2 text-sm font-semibold" role="status">
      <Clock3 size={16} className="shrink-0" aria-hidden />
      {status.texto}
    </p>
  );
}
