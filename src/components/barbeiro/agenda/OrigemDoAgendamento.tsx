import { Instagram, Link2, MessageCircle, ShieldAlert, UserRound, Zap } from "lucide-react";
import { descreverOrigem, type IconeOrigem } from "@/lib/origem-agendamento";

const ICONES: Record<IconeOrigem, typeof Link2> = {
  whatsapp: MessageCircle,
  link: Link2,
  manual: UserRound,
  instagram: Instagram,
};

/** Linha compacta "· WhatsApp · Flow IA". Nunca quebra o card: rótulo curto em telas estreitas. */
export function OrigemDoAgendamento({
  origem,
  assistido,
  telefoneNaoConfirmado,
}: {
  origem: string | null | undefined;
  assistido: boolean | null | undefined;
  /** Agendado pelo link com o telefone de uma ficha existente, sem confirmar o número. */
  telefoneNaoConfirmado?: boolean | undefined;
}) {
  const d = descreverOrigem(origem, assistido);
  const Icone = ICONES[d.icone];
  return (
    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] leading-none text-mute">
      <span className="inline-flex min-w-0 items-center gap-1" aria-label={d.ariaOrigem}>
        <Icone className="h-3 w-3 shrink-0" aria-hidden />
        <span aria-hidden className="truncate">
          <span className="sm:hidden">{d.curto}</span>
          <span className="hidden sm:inline">{d.rotulo}</span>
        </span>
      </span>
      {d.cortai ? (
        <span className="inline-flex shrink-0 items-center gap-0.5" aria-label="Flow IA participou">
          <span aria-hidden>·</span>
          <Zap className="h-3 w-3" aria-hidden />
          <span aria-hidden>Flow IA</span>
        </span>
      ) : null}
      {telefoneNaoConfirmado ? (
        <span
          className="inline-flex shrink-0 items-center gap-0.5 text-rosa"
          aria-label="Telefone não confirmado: confira com o cliente"
          title="Agendado pelo link com o telefone de uma ficha existente, sem confirmar o número."
        >
          <span aria-hidden>·</span>
          <ShieldAlert className="h-3 w-3" aria-hidden />
          <span aria-hidden>
            <span className="sm:hidden">Conferir tel.</span>
            <span className="hidden sm:inline">Telefone não confirmado</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
