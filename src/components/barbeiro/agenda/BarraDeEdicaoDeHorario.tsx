import { motion } from "framer-motion";

import { CURVA, TEMPO } from "@/lib/movimento-figaro";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CircleAlert, Clock3 } from "lucide-react";
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
  salvo = false,
  semMudanca = false,
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
  /** Gravou: mostra "Pronto!" por um instante antes de fechar. */
  salvo?: boolean;
  /** Nada mudou ainda: Salvar fica desabilitado. */
  semMudanca?: boolean;
  onAvisar: (valor: boolean) => void;
  onDescartar: () => void;
  onSalvar: () => void;
}) {
  return (
    <motion.section
      data-edicao-ui=""
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ duration: TEMPO.etapaDeFluxo, ease: CURVA.rapidaParaLenta }}
      aria-label="Editar horário"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[min(55dvh,24rem)] w-full overflow-y-auto rounded-t-2xl border border-b-0 border-line bg-ink2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:max-w-[520px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-mute">Horário proposto</p>
          <p className="truncate text-sm font-semibold text-paper">{cliente}</p>
        </div>
        {/* Figaro (spec 2-agenda §6.4): com proposta inválida, o horário fica na cor de erro. */}
        <span
          data-invalido={motivo ? "" : undefined}
          className={`flex shrink-0 items-center gap-1.5 rounded-full bg-ink3 px-3 py-2 text-sm font-semibold ${motivo ? "text-brick" : "text-paper"}`}
        >
          <Clock3 aria-hidden="true" className="size-4 text-gold" />
          {hora(new Date(inicio).toISOString(), fuso)} – {hora(new Date(fim).toISOString(), fuso)}
        </span>
      </div>
      {motivo ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-lg border border-brick/30 bg-brick/10 px-3 py-2 text-sm font-semibold text-brick"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{motivo}</span>
        </p>
      ) : null}
      <div className="mt-3 flex min-h-12 items-center justify-between gap-4 border-t border-line pt-2">
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
          disabled={salvando || salvo}
        >
          Descartar
        </Button>
        <Button
          variant="primary"
          className="rounded-full"
          onClick={onSalvar}
          disabled={Boolean(motivo) || salvando || salvo || semMudanca}
          data-salvo={salvo ? "" : undefined}
        >
          {salvando ? "Salvando…" : salvo ? "Pronto!" : "Salvar"}
        </Button>
      </div>
    </motion.section>
  );
}
