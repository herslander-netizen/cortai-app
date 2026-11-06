/**
 * Um dia da disponibilidade semanal, no padrão Figaro (dono, 06/11/2026: "algumas coisas estão feias" no Onboarding).
 * Linha de grupo com o nome do dia e o interruptor de aberto; aberto mostra o expediente em chips de horário (o toque
 * abre o relógio `SeletorDeHorario`, nunca o campo de hora nativo) e o intervalo, que entra e sai por um chip.
 */
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Switch } from "@/components/ui/switch";
import { DIAS_DA_SEMANA, type HorarioSugerido } from "@/lib/ia/assistente";

export type CampoDoHorario = "abre" | "fecha" | "intervaloInicio" | "intervaloFim";

export const TITULO_DO_CAMPO: Record<CampoDoHorario, string> = {
  abre: "Abre às",
  fecha: "Fecha às",
  intervaloInicio: "Intervalo começa às",
  intervaloFim: "Intervalo termina às",
};

/** Cantos do grupo de linhas do Figaro: 28 nas pontas, 4 entre as linhas. */
export function formaDaLinha(indice: number, total: number) {
  if (total <= 1) return "rounded-[28px]";
  if (indice === 0) return "rounded-t-[28px] rounded-b-[4px]";
  if (indice === total - 1) return "rounded-b-[28px] rounded-t-[4px]";
  return "rounded-[4px]";
}

export function DiaDoHorario({
  horario: h,
  forma,
  onMudar,
  onEscolherHora,
}: {
  horario: HorarioSugerido;
  forma: string;
  onMudar: (campos: Partial<HorarioSugerido>) => void;
  onEscolherHora: (campo: CampoDoHorario) => void;
}) {
  const dia = DIAS_DA_SEMANA[h.diaSemana];
  const temIntervalo = Boolean(h.intervaloInicio && h.intervaloFim);
  const hora = (campo: CampoDoHorario, valor: string) => (
    <Chip
      className="h-9 min-w-[64px] px-3 tabular-nums"
      aria-label={`${dia}: ${TITULO_DO_CAMPO[campo].toLowerCase()} ${valor}`}
      onClick={() => onEscolherHora(campo)}
    >
      {valor}
    </Chip>
  );

  return (
    <li className={`bg-[var(--agenda-cartao,var(--figaro-card-tile))] px-4 py-3 ${forma}`}>
      <div className="flex min-h-10 items-center justify-between gap-3">
        <span className="text-[15px] font-medium text-paper">{dia}</span>
        <span className="flex items-center gap-3">
          <span className="text-[13px] text-mute">{h.fechado ? "Fechado" : "Aberto"}</span>
          <Switch
            checked={!h.fechado}
            aria-label={`${dia} aberto`}
            onCheckedChange={(aberto) => onMudar({ fechado: !aberto })}
          />
        </span>
      </div>
      {h.fechado ? null : (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {hora("abre", h.abre)}
            <span className="text-[13px] text-mute">até</span>
            {hora("fecha", h.fecha)}
          </div>
          {temIntervalo ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-mute">Intervalo</span>
              {hora("intervaloInicio", h.intervaloInicio!)}
              <span className="text-[13px] text-mute">até</span>
              {hora("intervaloFim", h.intervaloFim!)}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="toque-afunda size-9 text-mute"
                aria-label={`Tirar o intervalo de ${dia}`}
                onClick={() => onMudar({ intervaloInicio: null, intervaloFim: null })}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <Chip
              className="h-9 border-dashed px-3 text-mute"
              onClick={() => onMudar({ intervaloInicio: "12:00", intervaloFim: "13:00" })}
            >
              <Plus aria-hidden /> Intervalo
            </Chip>
          )}
        </div>
      )}
    </li>
  );
}
