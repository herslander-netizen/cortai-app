import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, Clock, Copy, Download, Home, ReceiptText, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getTicketPublicoDoAgendamento,
  informarPagamentoPix,
} from "@/lib/comanda-ticket.functions";
import { invalidarComandas, ROTULO_DA_ETAPA_CLIENTE, ROTULO_DO_ESTADO } from "@/lib/comanda-ticket";
import { brl } from "@/lib/format";
import { useAcoesDoTicket, IconeWhatsApp } from "./FolhaDoTicket";
import { LOGOTIPO_MARCA, SIMBOLO_MARCA, TicketComanda } from "./TicketComanda";

/**
 * Bloco da comanda na confirmação pública do agendamento.
 * Só aparece quando a comanda já existe (fechamento feito pelo negócio);
 * sem comanda, a confirmação segue igual, sem nenhum rastro deste bloco.
 */
export function TicketDaConfirmacao({
  agendamentoId,
  token,
  slug,
}: {
  agendamentoId: string;
  /** Prova de posse entregue na confirmação; fica só em memória. */
  token: string;
  slug: string;
}) {
  const buscar = useServerFn(getTicketPublicoDoAgendamento);
  const [aberto, setAberto] = useState(false);
  const q = useQuery({
    queryKey: ["ticket-publico", agendamentoId],
    queryFn: () => buscar({ data: { agendamentoId, token } }),
    staleTime: 30_000,
    retry: false,
  });
  const acoes = useAcoesDoTicket(q.data ?? undefined);
  const qc = useQueryClient();
  const informar = useServerFn(informarPagamentoPix);
  const jaPaguei = useMutation({
    mutationFn: () => informar({ data: { agendamentoId, token } }),
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
    <section className="mt-4 rounded-[var(--raio-bloco)] border border-line p-3 sm:mt-6 sm:p-4">
      <Button variant="outline" className="min-h-12 w-full justify-between gap-2 whitespace-normal text-left" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-left">
          <ReceiptText size={18} className="shrink-0 text-gold" aria-hidden />
          <span className="min-w-0 break-all">Comanda #{ticket.codigo}</span>
          <span className="shrink-0 text-xs font-normal text-mute">{rotuloEstado}</span>
        </span>
        <ChevronDown className={aberto ? "shrink-0 rotate-180 transition-transform duration-200" : "shrink-0 transition-transform duration-200"} aria-hidden />
      </Button>
      {mostrarPix && aberto ? (
        <div className="mt-3 min-w-0 rounded-[var(--raio-folha)] bg-[var(--ticket-fundo)] p-3">
          <p className="text-xs text-mute">Valor</p>
          <p className="text-xl font-bold text-paper">{brl(ticket.totalCentavos)}</p>
          <p className="mt-2 text-xs text-mute">Chave Pix</p>
          <p className="break-all text-sm text-paper">{ticket.pixChave}</p>
          {etapa === "pagamento_informado" ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-paper" role="status">
              <Clock size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden />
              Aguardando confirmação. O negócio vai conferir o recebimento.
            </p>
          ) : null}
          <div className="mt-3 grid gap-2">
            <Button variant="outline" onClick={() => void acoes.copiarPix()}><Copy aria-hidden />Copiar chave Pix</Button>
            {ticket.pixWhatsapp ? <Button variant="outline" asChild><a href={`https://wa.me/${ticket.pixWhatsapp}?text=${encodeURIComponent(textoComprovante)}`} target="_blank" rel="noreferrer"><IconeWhatsApp />Enviar comprovante pelo WhatsApp</a></Button> : null}
            {ticket.podeInformarPix ? <Button size="lg" className="h-12 rounded-full" loading={jaPaguei.isPending} disabled={jaPaguei.isPending} onClick={() => jaPaguei.mutate()}><CheckCircle2 aria-hidden />Já paguei</Button> : null}
          </div>
        </div>
      ) : null}
      {aberto ? (
        <div className="mt-3 min-w-0 rounded-[var(--raio-folha)] bg-[var(--ticket-fundo)] px-3 py-3 sm:px-4 sm:py-4">
          <TicketComanda ticket={ticket} />
          <div className="mx-auto mt-3 grid w-full max-w-[360px] gap-2 sm:mt-4">
            <Button size="lg" className="h-14 rounded-full" onClick={acoes.enviarWhatsApp} disabled={Boolean(acoes.gerando)}>
              <IconeWhatsApp />
              {acoes.gerando === "compartilhar" ? "Preparando imagem…" : "Enviar no WhatsApp"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="h-12 rounded-full" onClick={acoes.compartilhar} disabled={Boolean(acoes.gerando)}>
                <Share2 aria-hidden />
                {acoes.gerando === "compartilhar" ? "Preparando…" : "Compartilhar"}
              </Button>
              <Button variant="secondary" className="h-12 rounded-full" onClick={acoes.baixar} disabled={Boolean(acoes.gerando)}>
                <Download aria-hidden />
                {acoes.gerando === "baixar" ? "Gerando…" : "Baixar imagem"}
              </Button>
            </div>
          </div>
          <Button variant="ghost" className="mt-2 w-full" asChild><Link to="/b/$slug" params={{ slug }}><Home aria-hidden />Voltar para a página inicial</Link></Button>
        </div>
      ) : null}
    </section>
  );
}
