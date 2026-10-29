import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { aviso } from "@/lib/avisos";
import { salvarIntervaloDoDia } from "@/lib/intervalo-agenda.functions";

type Props = {
  aberta: boolean;
  onAbertaChange: (aberta: boolean) => void;
  dia: string;
  inicio: string;
  fim: string;
  inicioPadrao: string | null;
  fimPadrao: string | null;
};

function minutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function hora(minuto: number) {
  const normalizado = ((minuto % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalizado / 60)).padStart(2, "0")}:${String(normalizado % 60).padStart(2, "0")}`;
}

function diaLegivel(dia: string) {
  const [ano, mes, data] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano ?? 2000, (mes ?? 1) - 1, data ?? 1, 12)).toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" },
  );
}

export function IntervaloRapidoSheet({
  aberta,
  onAbertaChange,
  dia,
  inicio,
  fim,
  inicioPadrao,
  fimPadrao,
}: Props) {
  const salvar = useServerFn(salvarIntervaloDoDia);
  const queryClient = useQueryClient();
  const [horaInicio, setHoraInicio] = useState(inicio);
  const [horaFim, setHoraFim] = useState(fim);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const temHorarioSemanal = Boolean(inicioPadrao && fimPadrao);
  const difereDoPadrao =
    horaInicio !== (inicioPadrao ?? "") || horaFim !== (fimPadrao ?? "");

  useEffect(() => {
    if (!aberta) return;
    setHoraInicio(inicio);
    setHoraFim(fim);
    setErro(null);
  }, [aberta, inicio, fim]);

  function moverIntervalo(delta: number) {
    if (!horaInicio || !horaFim) return;
    setHoraInicio(hora(minutos(horaInicio) + delta));
    setHoraFim(hora(minutos(horaFim) + delta));
    setErro(null);
  }

  function alterarDuracao(delta: number) {
    if (!horaInicio || !horaFim) return;
    setHoraFim(hora(minutos(horaFim) + delta));
    setErro(null);
  }

  async function persistir(acao: "salvar" | "restaurar") {
    setSalvando(true);
    setErro(null);
    try {
      await salvar({
        data: {
          dia,
          acao,
          intervaloInicio: acao === "restaurar" ? null : horaInicio,
          intervaloFim: acao === "restaurar" ? null : horaFim,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["agenda-dia", dia] });
      await queryClient.invalidateQueries({ queryKey: ["agenda-agora-proximo"] });
      onAbertaChange(false);
      aviso.ok(acao === "restaurar" ? "Intervalo semanal restaurado neste dia." : "Intervalo deste dia atualizado.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet open={aberta} onOpenChange={onAbertaChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto">
        <SheetHeader className="pr-8">
          <SheetTitle>Ajustar intervalo</SheetTitle>
          <SheetDescription>
            {diaLegivel(dia)}. Esta alteração vale somente para este dia; os outros dias da semana não mudam.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="min-w-0 text-sm font-semibold text-paper">
            Início
            <input
              type="time"
              required
              value={horaInicio}
              onChange={(event) => {
                setHoraInicio(event.target.value);
                setErro(null);
              }}
              className="field-control mt-1 min-h-12 w-full"
              aria-label="Início do intervalo deste dia"
            />
          </label>
          <label className="min-w-0 text-sm font-semibold text-paper">
            Fim
            <input
              type="time"
              required
              value={horaFim}
              onChange={(event) => {
                setHoraFim(event.target.value);
                setErro(null);
              }}
              className="field-control mt-1 min-h-12 w-full"
              aria-label="Fim do intervalo deste dia"
            />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-mute">Mudar o horário</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-12 text-xs" disabled={salvando || !horaInicio || !horaFim} onClick={() => moverIntervalo(-15)}>
                Antecipar 15 min
              </Button>
              <Button type="button" variant="outline" className="min-h-12 text-xs" disabled={salvando || !horaInicio || !horaFim} onClick={() => moverIntervalo(15)}>
                Atrasar 15 min
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-mute">Ajustar a duração</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="min-h-12 text-xs" disabled={salvando || !horaInicio || !horaFim} onClick={() => alterarDuracao(-15)}>
                Encurtar 15 min
              </Button>
              <Button type="button" variant="outline" className="min-h-12 text-xs" disabled={salvando || !horaInicio || !horaFim} onClick={() => alterarDuracao(15)}>
                Alongar 15 min
              </Button>
            </div>
          </div>
        </div>

        {erro ? (
          <p className="mt-4 rounded-lg border border-status-error/40 bg-ink2 p-3 text-sm text-status-error" role="alert">
            {erro}
          </p>
        ) : null}

        <div className="mt-5 grid gap-2">
          <Button
            type="button"
            variant="primary"
            className="min-h-14 w-full"
            disabled={salvando || !horaInicio || !horaFim || horaInicio === horaFim}
            loading={salvando}
            onClick={() => void persistir("salvar")}
          >
            Salvar intervalo deste dia
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12 w-full"
            disabled={salvando || !temHorarioSemanal || !difereDoPadrao}
            onClick={() => void persistir("restaurar")}
          >
            Restaurar horário semanal
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 w-full"
            disabled={salvando}
            onClick={() => onAbertaChange(false)}
          >
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
