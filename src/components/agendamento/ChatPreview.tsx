import { CalendarDays, Check, Clock3, MessageCircleMore } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { agendamentoStyle, type PaginaConfig } from "@/lib/pagina-config";

export function ChatPreview({
  ativo = false,
  onExperimentar,
  config,
  nome = "Seu negócio",
  logoUrl,
  capaUrl,
}: {
  ativo?: boolean;
  onExperimentar?: () => void;
  config?: PaginaConfig;
  nome?: string;
  logoUrl?: string | null;
  capaUrl?: string | null;
}) {
  const estilo = config ? agendamentoStyle(config) : undefined;
  return (
    <div
      className={cn(
        "chat-preview-personalizado relative overflow-hidden rounded-lg border bg-ink2",
        ativo ? "border-gold" : "border-line",
      )}
      style={estilo}
    >
      {capaUrl ? (
        <img src={capaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="chat-preview-veil absolute inset-0" />
      <div className="relative flex items-center gap-3 border-b border-line px-4 py-3">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="size-9 rounded-full object-contain" />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-gold-soft text-gold">
            <MessageCircleMore size={17} />
          </span>
        )}
        <div>
          <p className="text-sm font-semibold text-paper">{nome}</p>
          <p className="text-xs text-sage">{config?.chat.nomeRecepcao ?? "Recepção"}</p>
        </div>
      </div>
      <div className="relative space-y-4 p-4 text-sm">
        <p className="max-w-[88%] text-paper">
          {config?.chat.mensagemInicial ??
            "Olá! Que bom receber você. Como posso organizar seu horário?"}
        </p>
        <p className="ml-auto w-fit rounded-lg bg-primary px-3 py-2 text-primary-foreground">
          Quero agendar
        </p>
        <div className="grid grid-cols-2 gap-2">
          <span className="rounded-lg border border-gold bg-ink px-3 py-3 text-paper">
            <Clock3 className="mb-2 text-gold" size={15} />
            Serviço
          </span>
          <span className="rounded-lg border border-line bg-ink px-3 py-3 text-paper">
            <CalendarDays className="mb-2 text-rosa" size={15} />
            Melhor dia
          </span>
        </div>
        <p className="flex items-center gap-2 text-xs text-mute">
          <Check size={14} className="text-sage" />
          Prévia: nenhum agendamento será criado.
        </p>
      </div>
      {onExperimentar ? (
        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full rounded-none border-t border-line"
          onClick={onExperimentar}
        >
          Experimentar conversa
        </Button>
      ) : null}
    </div>
  );
}
