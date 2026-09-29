import {
  CalendarCheck,
  CheckCircle2,
  CircleSlash,
  DoorOpen,
  RefreshCw,
  Scissors,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type Visual = { rotulo: string; Icone: LucideIcon; classe: string };

const MAPA: Record<string, Visual> = {
  agendado: {
    rotulo: "Confirmado",
    Icone: CalendarCheck,
    classe: "border-sage/40 text-sage",
  },
  chegou: {
    rotulo: "Você chegou",
    Icone: DoorOpen,
    classe: "border-sage/40 text-sage",
  },
  na_cadeira: {
    rotulo: "Na cadeira",
    Icone: Scissors,
    classe: "border-sage/40 text-sage",
  },
  finalizado: {
    rotulo: "Atendido",
    Icone: CheckCircle2,
    classe: "border-line2 text-mute",
  },
  cancelado: {
    rotulo: "Cancelado",
    Icone: XCircle,
    classe: "border-brick/40 text-brick",
  },
  remarcado: {
    rotulo: "Remarcado",
    Icone: RefreshCw,
    classe: "border-line2 text-mute",
  },
  nao_compareceu: {
    rotulo: "Não compareceu",
    Icone: CircleSlash,
    classe: "border-brick/40 text-brick",
  },
};

/** Estado do atendimento sempre com ícone + texto + cor. */
export function StatusAgendamento({ status, className }: { status: string; className?: string }) {
  const visual = MAPA[status] ?? {
    rotulo: status,
    Icone: CalendarCheck,
    classe: "border-line2 text-mute",
  };
  const { rotulo, Icone, classe } = visual;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classe} ${className ?? ""}`}
    >
      <Icone size={13} strokeWidth={1.75} aria-hidden />
      {rotulo}
    </span>
  );
}
