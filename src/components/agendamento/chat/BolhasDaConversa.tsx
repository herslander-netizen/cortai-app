import { useEffect, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { ChipsDeSugestao } from "./ChipsDeSugestao";
import type { MensagemExtra } from "./tipos";

/** Hora local "HH:mm" lida só no navegador (evita divergência entre servidor e tela). */
function useHoraDaMensagem() {
  const [hora, setHora] = useState("");
  useEffect(() => {
    setHora(
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }),
    );
  }, []);
  return hora;
}

/** Hora e, nas mensagens do cliente, os vistos: enviado, entregue e lido (como no WhatsApp). */
export function MetaDaMensagem({ cliente, hora }: { cliente: boolean; hora: string }) {
  if (!hora) return null;
  return (
    <span className="chat-meta" data-cliente={cliente ? "" : undefined}>
      <time>{hora}</time>
      {cliente ? (
        <svg className="chat-vistos" viewBox="0 0 18 12" aria-label="Mensagem lida" role="img">
          <path className="chat-visto-1" d="M1 6.5l3.5 3.5L11 2" />
          <path className="chat-visto-2" d="M7 9.5l1 1L15 2" />
        </svg>
      ) : null}
    </span>
  );
}

/** Marca o início da conversa, como o separador de dia do WhatsApp e do Telegram. */
export function SeparadorDeDia({ rotulo = "Hoje" }: { rotulo?: string }) {
  return (
    <div className="chat-dia" role="separator">
      <span>{rotulo}</span>
    </div>
  );
}

export function Fala({ children, cliente = false }: { children: ReactNode; cliente?: boolean }) {
  const hora = useHoraDaMensagem();
  return (
    <Message from={cliente ? "user" : "assistant"} className="chat-enter">
      <MessageContent
        className={
          cliente
            ? "chat-bolha-cliente px-4 py-3 font-semibold"
            : "chat-bolha-ia px-4 py-3 text-[15px] leading-relaxed"
        }
      >
        {children}
        <MetaDaMensagem cliente={cliente} hora={hora} />
      </MessageContent>
    </Message>
  );
}

/** Resposta do cliente que reabre só aquele passo ao ser tocada. */
export function BolhaEditavel({
  texto,
  rotulo,
  onEditar,
  fotoUrl,
}: {
  texto: string;
  rotulo: string;
  onEditar: () => void;
  /** Foto do serviço ou do profissional, mostrada como imagem com legenda. */
  fotoUrl?: string | null | undefined;
}) {
  const hora = useHoraDaMensagem();
  return (
    <Message from="user" className="chat-enter">
      <Button
        type="button"
        variant="ghost"
        onClick={onEditar}
        aria-label={`Alterar ${rotulo}: ${texto}`}
        data-com-foto={fotoUrl ? "" : undefined}
        className="chat-bolha-cliente ml-auto h-auto min-h-12 max-w-full flex-wrap justify-start gap-x-2 whitespace-normal px-4 py-3 text-left font-semibold"
      >
        {fotoUrl ? (
          <img src={fotoUrl} alt="" loading="lazy" decoding="async" className="chat-bolha-foto" />
        ) : null}
        <span className="underline decoration-dotted underline-offset-4">{texto}</span>
        <Pencil size={14} aria-hidden className="shrink-0 opacity-70" />
        <MetaDaMensagem cliente hora={hora} />
      </Button>
    </Message>
  );
}

export function MensagensExtras({ itens }: { itens: MensagemExtra[] }) {
  return (
    <>
      {itens.map((m) => (
        <Fala key={m.id} cliente={m.autor === "cliente"}>
          <span className="whitespace-pre-line">{m.texto}</span>
          {m.chips?.length ? (
            <div className="mt-3">
              <ChipsDeSugestao chips={m.chips} quebrar />
            </div>
          ) : null}
        </Fala>
      ))}
    </>
  );
}
