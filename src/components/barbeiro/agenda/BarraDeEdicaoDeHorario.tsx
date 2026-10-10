import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { hora } from "./tempo";

/** Barra fixa do modo "editar horário": o resultado, o aviso ao cliente e Descartar / Salvar. */
export function BarraDeEdicaoDeHorario({
  cliente,
  inicio,
  fim,
  fuso,
  motivo,
  avisar,
  salvando,
  onAvisar,
  onDescartar,
  onSalvar,
}: {
  cliente: string;
  inicio: number;
  fim: number;
  fuso: string;
  motivo: string | null;
  avisar: boolean;
  salvando: boolean;
  onAvisar: (valor: boolean) => void;
  onDescartar: () => void;
  onSalvar: () => void;
}) {
  return (
    <section
      aria-label="Editar horário"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[520px] rounded-t-2xl border border-b-0 border-line bg-ink2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
    >
      <p className="truncate text-sm font-semibold text-paper">
        {cliente} · {hora(new Date(inicio).toISOString(), fuso)} –{" "}
        {hora(new Date(fim).toISOString(), fuso)}
      </p>
      {motivo ? (
        <p role="alert" className="mt-1 text-sm font-semibold text-brick">
          {motivo}
        </p>
      ) : null}
      <div className="mt-3 flex min-h-12 items-center justify-between gap-4">
        <label htmlFor="avisar-cliente-horario" className="text-sm font-semibold text-paper">
          Avisar cliente por WhatsApp
        </label>
        <Switch id="avisar-cliente-horario" checked={avisar} onCheckedChange={onAvisar} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="rounded-full"
          onClick={onDescartar}
          disabled={salvando}
        >
          Descartar
        </Button>
        <Button
          variant="primary"
          className="rounded-full"
          onClick={onSalvar}
          disabled={Boolean(motivo) || salvando}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </section>
  );
}
