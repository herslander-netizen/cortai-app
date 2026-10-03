import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Copy, Download, Home, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getTicketPublicoDoAgendamento,
  informarPagamentoPix,
} from "@/lib/comanda-ticket.functions";
import {
  invalidarComandas,
  ROTULO_DA_ETAPA_CLIENTE,
  ROTULO_DO_ESTADO,
} from "@/lib/comanda-ticket";
import { brl } from "@/lib/format";
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
  const qc = useQueryClient();
  const informar = useServerFn(informarPagamentoPix);
  const jaPaguei = useMutation({
    mutationFn: () => informar({ data: { agendamentoId } }),
    onSuccess: () => toast.success("Pagamento informado. O negócio vai conferir e confirmar."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível registrar."),
    onSettled: () => invalidarComandas(qc),
  });

  if (!q.data) return null;
  const ticket = q.data;
  const etapa = ticket.etapaPagamento;
  const mostrarPix =
    ticket.forma === "pix" &&
    Boolean(ticket.pixChave) &&
    (etapa === "aguardando_pagamento" || etapa === "pagamento_informado");
  const rotuloEstado =
    etapa && ticket.estado === "pendente" && ticket.forma === "pix"
      ? ROTULO_DA_ETAPA_CLIENTE[etapa]
      : ROTULO_DO_ESTADO[ticket.estado];
  const textoComprovante = `Olá! Segue o comprovante do Pix da comanda #${ticket.codigo}, ${brl(ticket.totalCentavos)}.`;

  return (
    <section className="mt-6 rounded-[var(--raio-bloco)] border border-line p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-paper">
        <ReceiptText size={16} className="text-gold" aria-hidden />
        Comanda #{ticket.codigo}
        <span className="ml-auto text-xs font-normal text-mute">
          {rotuloEstado}
        </span>
      </p>
      {mostrarPix ? (
        <div className="mt-3 rounded-[var(--raio-bloco)] border border-line p-3">
          <p className="text-xs text-mute">Valor</p>
          <p className="text-2xl font-bold text-paper">{brl(ticket.totalCentavos)}</p>
          <p className="mt-2 text-xs text-mute">Chave Pix</p>
          <p className="break-all text-sm text-paper">{ticket.pixChave}</p>
          {etapa === "pagamento_informado" ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-paper" role="status">
              <Clock size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden />
              Aguardando confirmação. O negócio vai conferir o recebimento.
            </p>
          ) : null}
          <div className="mt-3 grid gap-2">
            <Button variant="outline" onClick={() => void acoes.copiarPix()}>
              <Copy aria-hidden />
              Copiar chave Pix
            </Button>
            {ticket.pixWhatsapp ? (
              <Button variant="outline" asChild>
                <a
                  href={`https://wa.me/${ticket.pixWhatsapp}?text=${encodeURIComponent(textoComprovante)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconeWhatsApp />
                  Enviar comprovante pelo WhatsApp
                </a>
              </Button>
            ) : null}
            {ticket.podeInformarPix ? (
              <Button
                size="lg"
                className="h-12"
                loading={jaPaguei.isPending}
                disabled={jaPaguei.isPending}
                onClick={() => jaPaguei.mutate()}
              >
                <CheckCircle2 aria-hidden />
                Já paguei
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
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
              <Button
                variant="secondary"
                className="h-12 rounded-full"
                onClick={acoes.copiarCodigo}
              >
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
