import { CalendarDays, Check, Clock3 } from "lucide-react";

import { ChatHeader } from "@/components/chat/ChatShell";
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
      <div className="relative">
        <ChatHeader
          nome={config?.chat.nomeRecepcao ?? "Recepção"}
          avatarUrl={logoUrl}
          status="Online"
          detalhe={nome}
        />
      </div>
      <div className="relative space-y-4 p-4 text-sm">
        <p className="max-w-[88%] text-paper">
          {config?.chat.mensagemInicial ??
            "Olá! Que bom receber você. Como posso organizar seu horário?"}
        </p>
        <p className="chat-bolha-cliente ml-auto w-fit px-3 py-2">Quero agendar</p>
        <div className="grid grid-cols-2 gap-2">
          <span className="chat-opcao-previa rounded-lg px-3 py-3">
            <Clock3 className="mb-2" size={15} />
            Serviço
          </span>
          <span className="chat-opcao-previa rounded-lg px-3 py-3">
            <CalendarDays className="mb-2" size={15} />
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
