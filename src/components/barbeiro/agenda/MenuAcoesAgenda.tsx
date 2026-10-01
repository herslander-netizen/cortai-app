import { CalendarPlus, Clock3, Plus, Scissors, UserPlus, UserRoundPlus } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** Menu único de ações da agenda (tela normal e Modo Foco). */
export function MenuAcoesAgenda({
  aberto,
  onAberto,
  fila,
  proximoDaFila,
  online,
  ocupado,
  onNovoAgendamento,
  onEncaixe,
  onChamarFila,
  onBloquear,
  onNovoCliente,
  comBotaoFechar = true,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  fila: number;
  proximoDaFila?: string | undefined;
  online: boolean;
  ocupado: boolean;
  onNovoAgendamento: () => void;
  onEncaixe: () => void;
  onChamarFila: () => void;
  onBloquear: () => void;
  onNovoCliente: () => void;
  comBotaoFechar?: boolean;
}) {
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const t = window.setTimeout(() => {
      lista.current?.querySelector<HTMLElement>("[role=menuitem]:not([disabled])")?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [aberto]);

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const itens = [
      ...(lista.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? []),
    ];
    if (!itens.length) return;
    e.preventDefault();
    const atual = itens.indexOf(document.activeElement as HTMLElement);
    const proximo =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? itens.length - 1
          : (atual + (e.key === "ArrowDown" ? 1 : -1) + itens.length) % itens.length;
    itens[proximo]?.focus();
  }

  const escolher = (f: () => void) => () => {
    onAberto(false);
    f();
  };

  return (
    <Sheet open={aberto} onOpenChange={onAberto}>
      <SheetContent
        side="bottom"
        className="agenda-acoes-folha mov-agenda-folha mx-auto w-full max-w-[520px] rounded-t-xl border-line bg-ink2 px-5 pt-5"
      >
        {comBotaoFechar ? (
          <SheetClose asChild>
            <Button
              type="button"
              size="lg"
              variant="primary"
              aria-label="Fechar ações da agenda"
              className="agenda-acao-redonda agenda-acao-fechar"
            >
              <Plus className="agenda-fab-icone agenda-fab-icone-aberto" />
            </Button>
          </SheetClose>
        ) : null}
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-base text-paper">Ações da agenda</SheetTitle>
          <SheetDescription className="text-xs text-mute">
            O que você precisa fazer agora?
          </SheetDescription>
        </SheetHeader>
        <div
          ref={lista}
          className="mt-3 divide-y divide-line"
          role="menu"
          aria-label="Ações da agenda"
          onKeyDown={teclas}
        >
          <Button
            variant="ghost"
            role="menuitem"
            className="agenda-acao-lista"
            onClick={escolher(onNovoAgendamento)}
          >
            <CalendarPlus />
            <span>
              <strong>Novo agendamento</strong>
              <small>Marcar dia, horário e profissional</small>
            </span>
          </Button>
          <Button
            variant="ghost"
            role="menuitem"
            className="agenda-acao-lista"
            disabled={!online}
            onClick={escolher(onEncaixe)}
          >
            <Scissors />
            <span>
              <strong>Encaixar cliente</strong>
              <small>Atender quem chegou sem horário</small>
            </span>
          </Button>
          <Button
            variant="ghost"
            role="menuitem"
            className="agenda-acao-lista"
            onClick={escolher(onNovoCliente)}
          >
            <UserPlus />
            <span>
              <strong>Novo cliente</strong>
              <small>Cadastrar e marcar um horário</small>
            </span>
          </Button>
          <Button
            variant="ghost"
            role="menuitem"
            className="agenda-acao-lista"
            disabled={!fila || ocupado || !online}
            onClick={escolher(onChamarFila)}
          >
            <UserRoundPlus />
            <span>
              <strong>Chamar próximo da fila</strong>
              <small>
                {fila
                  ? `${proximoDaFila ?? "Cliente"} está aguardando`
                  : "Ninguém aguardando agora"}
              </small>
            </span>
          </Button>
          <Button
            variant="ghost"
            role="menuitem"
            className="agenda-acao-lista"
            onClick={escolher(onBloquear)}
          >
            <Clock3 />
            <span>
              <strong>Bloquear horário</strong>
              <small>Fechar um período da agenda</small>
            </span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
