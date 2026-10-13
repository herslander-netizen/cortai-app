import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

import { Message, MessageContent } from "@/components/ai-elements/message";
import { ChipsDeSugestao } from "./ChipsDeSugestao";
import type { MensagemExtra } from "./tipos";

export function Fala({ children, cliente = false }: { children: ReactNode; cliente?: boolean }) {
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
      </MessageContent>
    </Message>
  );
}

/** Resposta do cliente que reabre só aquele passo ao ser tocada. */
export function BolhaEditavel({
  texto,
  rotulo,
  onEditar,
}: {
  texto: string;
  rotulo: string;
  onEditar: () => void;
}) {
  return (
    <Message from="user" className="chat-enter">
      <button
        type="button"
        onClick={onEditar}
        aria-label={`Alterar ${rotulo}: ${texto}`}
        className="chat-bolha-cliente ml-auto inline-flex min-h-12 items-center gap-2 px-4 py-3 text-left font-semibold underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {texto}
        <Pencil size={14} aria-hidden className="shrink-0 opacity-70" />
      </button>
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
