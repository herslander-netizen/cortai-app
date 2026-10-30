import { useState, type ReactNode, type RefObject } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipsDeSugestao } from "./ChipsDeSugestao";
import type { Chip } from "./tipos";

/** Bandeja fixa: chips acima do teclado, campo e enviar. Ações ficam no menu do cabeçalho. */
export function BarraDeMensagem({
  chips,
  onEnviar,
  campoRef,
  acima,
}: {
  chips: Chip[];
  onEnviar: (texto: string) => void;
  campoRef: RefObject<HTMLInputElement | null>;
  acima?: ReactNode;
}) {
  const [texto, setTexto] = useState("");
  return (
    <div className="chat-bandeja agendamento-marca-barra border-t border-line pt-2">
      {acima ? <div className="px-4 pb-2">{acima}</div> : null}
      <ChipsDeSugestao chips={chips} />
      <form
        className="flex items-center gap-2 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          onEnviar(texto);
          setTexto("");
        }}
      >
        <Input
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: sábado de manhã"
          aria-label="Escreva sua mensagem"
          enterKeyHint="send"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-full px-4 text-base"
        />
        <Button
          type="submit"
          className="size-12 shrink-0 rounded-full p-0"
          aria-label="Enviar"
          disabled={!texto.trim()}
        >
          <SendHorizontal />
        </Button>
      </form>
    </div>
  );
}
