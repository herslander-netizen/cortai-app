import { Clock3 } from "lucide-react";
import { statusDeFuncionamento } from "@/lib/status-funcionamento";
import type { HorarioDeFuncionamento } from "@/lib/horarios";

export function StatusFuncionamento({
  horarios,
  fuso,
}: {
  horarios: HorarioDeFuncionamento[];
  fuso: string;
}) {
  const status = statusDeFuncionamento(horarios, fuso);
  if (!status) return null;
  return (
    <p className="flex min-h-12 items-center gap-2 text-sm font-semibold" role="status">
      <Clock3 size={16} className="shrink-0" aria-hidden />
      {status.texto}
    </p>
  );
}
