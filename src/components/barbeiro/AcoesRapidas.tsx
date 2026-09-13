import { useNavigate } from "@tanstack/react-router";
import { CalendarPlus, ContactRound, Scissors, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const acoes = [
  {
    label: "Novo agendamento",
    detalhe: "Marcar dia, horário e profissional",
    icon: CalendarPlus,
    to: "/barbeiro/agenda" as const,
    search: { acao: "agendamento" as const },
  },
  {
    label: "Novo atendimento",
    detalhe: "Encaixar quem chegou agora",
    icon: Scissors,
    to: "/barbeiro/agenda" as const,
    search: { acao: "atendimento" as const },
  },
  {
    label: "Nova venda",
    detalhe: "Registrar produto no balcão",
    icon: ShoppingBag,
    to: "/barbeiro/produtos" as const,
  },
  {
    label: "Novo cliente",
    detalhe: "Cadastrar durante um agendamento",
    icon: ContactRound,
    to: "/barbeiro/agenda" as const,
    search: { acao: "cliente" as const },
  },
] as const;

export function AcoesRapidas() {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <Button
        type="button"
        size="icon"
        aria-label="Abrir ações rápidas"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
        className="quick-action-trigger h-14 w-14 rounded-full border border-gold/70 bg-gold text-ink shadow-lg"
      >
        <Scissors className="h-6 w-6" strokeWidth={2.2} />
      </Button>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[82vh] max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink3 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-paper">Ações rápidas</SheetTitle>
          <SheetDescription className="text-mute">O que você precisa fazer agora?</SheetDescription>
        </SheetHeader>
        <div className="mt-5 grid gap-2">
          {acoes.map((acao) => {
            const Icon = acao.icon;
            return (
              <Button
                key={acao.label}
                type="button"
                variant="ghost"
                className="h-auto min-h-16 w-full justify-start gap-4 whitespace-normal rounded-lg border border-line bg-ink2 px-4 py-3 text-left hover:bg-ink active:bg-ink2"
                onClick={async () => {
                  setAberto(false);
                  if ("search" in acao) {
                    await navigate({ to: acao.to, search: acao.search });
                  } else {
                    await navigate({ to: acao.to });
                  }
                }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold">
                  <Icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-paper">{acao.label}</span>
                  <span className="mt-0.5 block text-xs font-normal text-mute">{acao.detalhe}</span>
                </span>
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}