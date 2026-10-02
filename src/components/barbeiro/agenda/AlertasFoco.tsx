import { TriangleAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AlertaEmergencia } from "./alertas-foco";

export function AlertasFoco({
  alertas,
  onDispensar,
}: {
  alertas: AlertaEmergencia[];
  onDispensar: (id: string) => void;
}) {
  if (!alertas.length) return null;
  return (
    <div className="grid gap-2 px-3 pt-2" aria-live="assertive">
      {alertas.map((alerta) => (
        <div
          key={alerta.id}
          role="alert"
          className={`flex min-h-12 items-center gap-3 px-3 py-2 text-base ${alerta.tipo === "sem_internet" ? "bg-brick text-paper" : "border border-brick bg-ink2 text-paper"}`}
        >
          {alerta.tipo === "sem_internet" ? (
            <WifiOff className="size-5 shrink-0" aria-hidden />
          ) : (
            <TriangleAlert className="size-5 shrink-0" aria-hidden />
          )}
          <span className="min-w-0 flex-1 text-sm font-semibold">{alerta.texto}</span>
          {alerta.dispensavel ? (
            <Button variant="ghost" onClick={() => onDispensar(alerta.id)}>
              Entendi
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
