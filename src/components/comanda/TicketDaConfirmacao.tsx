import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Copy, Download, Home, ReceiptText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getTicketPublicoDoAgendamento } from "@/lib/comanda-ticket.functions";
import { ROTULO_DO_ESTADO } from "@/lib/comanda-ticket";
import { useAcoesDoTicket, IconeWhatsApp } from "./FolhaDoTicket";
import { SIMBOLO_CORTAI, TicketComanda } from "./TicketComanda";

/**
 * Bloco da comanda na confirmação pública do agendamento.
 * Só aparece quando a comanda já existe (fechamento feito pelo negócio);
 * sem comanda, a confirmação segue igual, sem nenhum rastro deste bloco.
 */
export function TicketDaConfirmacao({
  agendamentoId,
  slug,
}: {
  agendamentoId: string;
  slug: string;
}) {
  const buscar = useServerFn(getTicketPublicoDoAgendamento);
  const [aberto, setAberto] = useState(false);
  const q = useQuery({
    queryKey: ["ticket-publico", agendamentoId],
    queryFn: () => buscar({ data: { agendamentoId } }),
    staleTime: 30_000,
    retry: false,
  });
  const acoes = useAcoesDoTicket(q.data ?? undefined);

  if (!q.data) return null;
  const ticket = q.data;

  return (
    <section className="mt-6 rounded-[var(--raio-bloco)] border border-line p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-paper">
        <ReceiptText size={16} className="text-gold" aria-hidden />
        Comanda #{ticket.codigo}
        <span className="ml-auto text-xs font-normal text-mute">
          {ROTULO_DO_ESTADO[ticket.estado]}
        </span>
      </p>
      <div className="mt-3 grid gap-2">
        <Button variant="outline" onClick={() => setAberto(true)}>
          <ReceiptText aria-hidden />
          Ver comanda
        </Button>
        <Button variant="outline" onClick={acoes.copiarCodigo}>
          <Copy aria-hidden />
          Copiar código
        </Button>
        <Button asChild variant="ghost">
          <Link to="/b/$slug" params={{ slug }}>
            <Home aria-hidden />
            Voltar para a página inicial
          </Link>
        </Button>
      </div>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent
          side="bottom"
          className="max-h-[94dvh] overflow-y-auto rounded-t-[var(--raio-folha)] border-0 bg-[var(--ticket-fundo)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Comanda #{ticket.codigo}</SheetTitle>
            <SheetDescription>Detalhes da comanda deste atendimento.</SheetDescription>
          </SheetHeader>
          <TicketComanda
            ticket={ticket}
            onCopiarPix={acoes.copiarPix}
            onCopiarCodigo={acoes.copiarCodigo}
          />
          <div className="mx-auto mt-6 grid w-full max-w-[360px] gap-2">
            <Button
              size="lg"
              className="h-14 rounded-full"
              onClick={acoes.enviarWhatsApp}
              disabled={Boolean(acoes.gerando)}
            >
              <IconeWhatsApp />
              {acoes.gerando === "whatsapp" ? "Gerando imagem…" : "Enviar no WhatsApp"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="h-12 rounded-full"
                onClick={acoes.baixar}
                disabled={Boolean(acoes.gerando)}
              >
                <Download aria-hidden />
                {acoes.gerando === "baixar" ? "Gerando…" : "Baixar imagem"}
              </Button>
              <Button variant="secondary" className="h-12 rounded-full" onClick={acoes.copiarCodigo}>
                <Copy aria-hidden />
                Copiar código
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
