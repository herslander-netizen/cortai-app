import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3, Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SeletorDeHorario } from "@/components/ui/seletor-de-horario";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { aviso } from "@/lib/avisos";
import { diaDaSemanaDoDia, hojeNoFuso } from "@/lib/horarios";
import type { AgendaDia } from "@/lib/barbeiro.functions";
import { restaurarIntervaloAgendaDia, salvarIntervaloAgendaDia } from "@/lib/intervalos-agenda.functions";

import { dataEditorial } from "./tempo";

type Intervalo = { inicio: string; fim: string };
type Horario = AgendaDia["horarios"][number];

function min(valor: string) {
  const [h = 0, m = 0] = valor.split(":").map(Number);
  return h * 60 + m;
}
function formatarMinutos(valor: number) {
  const m = (valor + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function ajustar(valor: string, delta: number) {
  return formatarMinutos(min(valor) + delta);
}

export function AjustarIntervaloSheet({
  aberto,
  onAberto,
  dia,
  fuso,
  horarios,
  intervaloPersonalizado,
}: {
  aberto: boolean;
  onAberto: (valor: boolean) => void;
  dia: string;
  fuso: string;
  horarios: Horario[];
  intervaloPersonalizado: Intervalo | null;
}) {
  const qc = useQueryClient();
  const salvarFn = useServerFn(salvarIntervaloAgendaDia);
  const restaurarFn = useServerFn(restaurarIntervaloAgendaDia);
  const hoje = hojeNoFuso(fuso);
  const horario = horarios.find((h) => h.diaSemana === diaDaSemanaDoDia(dia) && !h.fechado);
  const semanal = horario?.intervaloInicio && horario?.intervaloFim
    ? { inicio: horario.intervaloInicio, fim: horario.intervaloFim }
    : null;
  const atual = intervaloPersonalizado ?? semanal;
  const [inicio, setInicio] = useState(atual?.inicio ?? "12:00");
  const [fim, setFim] = useState(atual?.fim ?? "13:00");
  const [relogio, setRelogio] = useState<"inicio" | "fim" | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setInicio(atual?.inicio ?? "12:00");
    setFim(atual?.fim ?? "13:00");
    setRelogio(null);
  }, [aberto, dia, intervaloPersonalizado?.inicio, intervaloPersonalizado?.fim, semanal?.inicio, semanal?.fim]);

  const gravar = useMutation({
    mutationFn: () => salvarFn({ data: { dia, inicio, fim } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda-dia", dia] });
      void qc.invalidateQueries({ queryKey: ["agenda-periodo"] });
      aviso.ok("Intervalo atualizado somente para este dia.");
      onAberto(false);
    },
    onError: (erro) => aviso.erro(erro instanceof Error ? erro.message : "Não foi possível salvar o intervalo."),
  });
  const restaurar = useMutation({
    mutationFn: () => restaurarFn({ data: { dia } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["agenda-dia", dia] });
      void qc.invalidateQueries({ queryKey: ["agenda-periodo"] });
      aviso.ok("Intervalo semanal restaurado para este dia.");
      onAberto(false);
    },
    onError: (erro) => aviso.erro(erro instanceof Error ? erro.message : "Não foi possível restaurar o intervalo."),
  });

  const dentroDoExpediente = (() => {
    if (!horario) return false;
    const abre = min(horario.abre);
    let fecha = min(horario.fecha);
    let ini = min(inicio);
    let fimMin = min(fim);
    if (fecha <= abre) fecha += 1440;
    if (ini < abre) ini += 1440;
    if (fimMin < abre) fimMin += 1440;
    if (fimMin <= ini) fimMin += 1440;
    return ini >= abre && fimMin <= fecha && fimMin > ini;
  })();
  const duracao = (() => {
    let v = min(fim) - min(inicio);
    if (v <= 0) v += 1440;
    return v;
  })();
  const invalido = !horario || !dentroDoExpediente || !duracao || dia < hoje;
  const ocupado = gravar.isPending || restaurar.isPending;

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] w-full max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink2 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-xl text-paper">Ajustar intervalo</SheetTitle>
          <SheetDescription className="text-sm text-mute">
            {dia === hoje ? "Hoje" : dataEditorial(dia)} · somente nesta data
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 rounded-2xl bg-ink3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-mute">Duração do intervalo</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-paper">{duracao} min</p>
            </div>
            <Clock3 className="size-6 text-mute" aria-hidden />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              disabled={ocupado || duracao <= 15}
              onClick={() => setFim(ajustar(fim, -15))}
            >
              <Minus aria-hidden /> Diminuir 15 min
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              disabled={ocupado || duracao >= 360}
              onClick={() => setFim(ajustar(fim, 15))}
            >
              <Plus aria-hidden /> Aumentar 15 min
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {([
            { qual: "inicio", titulo: "Início", valor: inicio, set: setInicio },
            { qual: "fim", titulo: "Fim", valor: fim, set: setFim },
          ] as const).map(({ qual, titulo, valor, set }) => (
            <div key={qual} className="min-w-0">
              <p className="text-sm text-mute">{titulo}</p>
              <button
                type="button"
                className="field-control mt-1 flex min-h-12 w-full items-center justify-center gap-2 text-lg font-semibold tabular-nums text-paper"
                onClick={() => setRelogio(qual)}
                aria-label={`Escolher ${titulo.toLowerCase()} do intervalo: ${valor}`}
              >
                <Clock3 className="size-4" aria-hidden /> {valor}
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="min-h-10 px-2" disabled={ocupado} onClick={() => set(ajustar(valor, -15))}>
                  −15 min
                </Button>
                <Button type="button" variant="outline" className="min-h-10 px-2" disabled={ocupado} onClick={() => set(ajustar(valor, 15))}>
                  +15 min
                </Button>
              </div>
            </div>
          ))}
        </div>

        <SeletorDeHorario
          aberto={relogio !== null}
          titulo={relogio === "fim" ? "Fim do intervalo" : "Início do intervalo"}
          valor={relogio === "fim" ? fim : inicio}
          onAberto={(valor) => !valor && setRelogio(null)}
          onEscolher={(valor) => {
            if (relogio === "fim") setFim(valor);
            else setInicio(valor);
          }}
        />

        {!dentroDoExpediente ? (
          <p className="mt-3 text-sm text-brick" role="alert">
            Escolha um intervalo dentro do expediente, com o fim depois do início.
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
          <Button type="button" variant="outline" size="lg" className="min-w-0" disabled={ocupado} onClick={() => onAberto(false)}>
            Cancelar
          </Button>
          <Button type="button" size="lg" className="min-w-0" disabled={invalido || ocupado} onClick={() => gravar.mutate()}>
            {gravar.isPending ? "Salvando…" : "Salvar intervalo"}
          </Button>
        </div>

        {intervaloPersonalizado ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 min-h-11 w-full"
            disabled={ocupado || dia < hoje}
            onClick={() => restaurar.mutate()}
          >
            <RotateCcw aria-hidden /> Restaurar horário semanal ({semanal?.inicio ?? "sem pausa"}{semanal ? `–${semanal.fim}` : ""})
          </Button>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
