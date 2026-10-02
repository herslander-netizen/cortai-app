import { useState, type ReactNode, type RefObject } from "react";
import { Menu, RotateCcw, SendHorizontal, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChipsDeSugestao } from "./ChipsDeSugestao";
import type { Chip } from "./tipos";

/** Bandeja fixa: chips acima do teclado, menu, campo e enviar. */
export function BarraDeMensagem({
  chips,
  onEnviar,
  onRecomecar,
  linkEquipe,
  campoRef,
  acima,
}: {
  chips: Chip[];
  onEnviar: (texto: string) => void;
  onRecomecar: () => void;
  linkEquipe: string | null;
  campoRef: RefObject<HTMLInputElement | null>;
  acima?: ReactNode;
}) {
  const [texto, setTexto] = useState("");
  return (
    <div className="chat-bandeja agendamento-marca-barra border-t border-line pt-2">
      {acima ? <div className="px-4 pb-2">{acima}</div> : null}
      <ChipsDeSugestao chips={chips} />
      <form
        className="flex items-center gap-2 px-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          onEnviar(texto);
          setTexto("");
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="icon" className="size-12 shrink-0" aria-label="Menu">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem className="min-h-12" onSelect={onRecomecar}>
              <RotateCcw />
              Recomeçar
            </DropdownMenuItem>
            {linkEquipe ? (
              <DropdownMenuItem asChild className="min-h-12">
                <a href={linkEquipe} target="_blank" rel="noreferrer">
                  <MessageCircle />
                  Falar com a equipe
                </a>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <Input
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva aqui, ex.: corte e barba sábado de manhã"
          aria-label="Escreva sua mensagem"
          enterKeyHint="send"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 text-base"
        />
        <Button
          type="submit"
          className="size-12 shrink-0 p-0"
          aria-label="Enviar"
          disabled={!texto.trim()}
        >
          <SendHorizontal />
        </Button>
      </form>
    </div>
  );
}
