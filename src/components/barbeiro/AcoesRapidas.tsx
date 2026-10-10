import { useNavigate } from "@tanstack/react-router";
import { CalendarPlus, ContactRound, Plus, Scissors, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getSessao } from "@/lib/sessao.functions";
import type { ChaveDePermissao } from "@/lib/permissoes";

const acoes = [
  {
    label: "Novo agendamento",
    detalhe: "Marcar dia, horário e profissional",
    icon: CalendarPlus,
    to: "/barbeiro/agenda" as const,
    search: { acao: "agendamento" as const },
    permissao: "criar_agendamento" as ChaveDePermissao,
  },
  {
    label: "Novo atendimento",
    detalhe: "Encaixar quem chegou agora",
    icon: Scissors,
    to: "/barbeiro/agenda" as const,
    search: { acao: "atendimento" as const },
    permissao: "agendamento_manual" as ChaveDePermissao,
  },
  {
    label: "Nova venda",
    detalhe: "Registrar produto no balcão",
    icon: ShoppingBag,
    to: "/barbeiro/produtos" as const,
    permissao: "registrar_venda" as ChaveDePermissao,
  },
  {
    label: "Novo cliente",
    detalhe: "Cadastrar durante um agendamento",
    icon: ContactRound,
    to: "/barbeiro/agenda" as const,
    search: { acao: "cliente" as const },
    permissao: "editar_clientes" as ChaveDePermissao,
  },
] as const;

const ROTAS_COM_ACOES_RAPIDAS_NO_CABECALHO = new Set(["/barbeiro/hoje", "/barbeiro/casa"]);

/**
 * O atalho do cabeçalho pertence apenas ao acompanhamento operacional.
 * A Agenda usa seu próprio FAB contextual e as demais telas mantêm somente
 * as ações específicas do próprio conteúdo.
 */
export function deveMostrarAcoesRapidasNoCabecalho(caminho: string) {
  const caminhoNormalizado = caminho.replace(/\/$/, "") || "/";
  return ROTAS_COM_ACOES_RAPIDAS_NO_CABECALHO.has(caminhoNormalizado);
}

export function AcoesRapidas() {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300000,
  });
  const acoesPermitidas = acoes.filter((acao) => sessao?.permissoes.includes(acao.permissao));

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <Button
        type="button"
        size="icon"
        aria-label="Abrir ações rápidas"
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
        className="quick-action-trigger h-10 w-10 rounded-md border border-line bg-primary text-primary-foreground"
      >
        <Plus className="h-5 w-5" strokeWidth={1.75} />
      </Button>
      <SheetContent
        side="bottom"
        arrastarParaFechar
        className="management-popover mx-auto max-h-[82vh] max-w-[520px] overflow-y-auto rounded-t-xl border-line bg-ink3 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle className="text-paper">Ações rápidas</SheetTitle>
          <SheetDescription className="text-mute">O que você precisa fazer agora?</SheetDescription>
        </SheetHeader>
        <div className="mt-5 grid gap-2">
          {acoesPermitidas.map((acao) => {
            const Icon = acao.icon;
            return (
              <Button
                key={acao.label}
                type="button"
                variant="ghost"
                className="h-auto min-h-16 w-full justify-start gap-4 whitespace-normal surface px-4 py-3 text-left hover:bg-ink active:bg-ink2"
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
