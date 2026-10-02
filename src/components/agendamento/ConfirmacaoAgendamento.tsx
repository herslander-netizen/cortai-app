import { CalendarPlus, CalendarX, MessageCircle, Share2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { VistoAnimado } from "@/components/ui/VistoAnimado";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { IngressoAgendamento } from "./IngressoAgendamento";
import { gerarIcs } from "@/lib/previa";
import type { ConfirmacaoPublica } from "@/lib/agendamento-publico.functions";

export type SituacaoPublica =
  "confirmado" | "cancelado" | "cancelado_pela_barbearia" | "remarcado" | "nao_compareceu";

function calendario(confirmacao: ConfirmacaoPublica) {
  return gerarIcs({
    id: confirmacao.agendamentoId,
    inicio: confirmacao.inicio,
    fim: confirmacao.fim,
    titulo: `${confirmacao.servico} — ${confirmacao.barbearia}`,
    local: confirmacao.endereco ?? confirmacao.barbearia,
    descricao: `Com ${confirmacao.profissional}. Agendado pelo Cortaí.`,
  });
}

function carimboGoogle(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function horaLocal(iso: string, fuso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  });
}

function dataLocal(iso: string, fuso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: fuso,
  });
}

export function linkGoogleAgenda(confirmacao: ConfirmacaoPublica) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${confirmacao.servico} — ${confirmacao.barbearia}`,
    dates: `${carimboGoogle(confirmacao.inicio)}/${carimboGoogle(confirmacao.fim)}`,
    location: confirmacao.endereco ?? confirmacao.barbearia,
    details: `Atendimento com ${confirmacao.profissional}. Agendado pelo Cortaí.`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function baixarArquivoIcs(confirmacao: ConfirmacaoPublica) {
  const url = URL.createObjectURL(
    new Blob([calendario(confirmacao)], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "agendamento.ics";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ConfirmacaoAgendamento({
  confirmacao,
  situacao,
  fuso,
  logoUrl,
  capaUrl,
  assinaturaVisivel = true,
  textoFinal,
  cancelando,
  erro,
  extras,
  onAlterar,
  onCancelar,
  onNovo,
}: {
  confirmacao: ConfirmacaoPublica;
  situacao: SituacaoPublica;
  fuso: string;
  logoUrl?: string | null;
  capaUrl?: string | null;
  assinaturaVisivel?: boolean;
  textoFinal?: string;
  cancelando?: boolean;
  erro?: string;
  extras?: React.ReactNode;
  onAlterar: () => void;
  onCancelar: () => void;
  onNovo: () => void;
}) {
  const ativo = situacao === "confirmado";
  const podeCompartilhar =
    typeof navigator !== "undefined" && typeof navigator.share === "function";
  const titulo = {
    confirmado: "Agendamento confirmado",
    cancelado: "Agendamento cancelado",
    cancelado_pela_barbearia: "O negócio cancelou este horário",
    remarcado: "O negócio remarcou este horário",
    nao_compareceu: "Este horário foi marcado como falta",
  }[situacao];
  const compartilhamento = useMemo(
    () =>
      `${confirmacao.servico} com ${confirmacao.profissional}, ${dataLocal(confirmacao.inicio, fuso)} às ${horaLocal(confirmacao.inicio, fuso)}, em ${confirmacao.barbearia}.`,
    [confirmacao, fuso],
  );
  return (
    <main className="agendamento-confirmacao min-h-dvh pb-12">
      <header className="relative overflow-hidden px-5 pb-6 pt-[max(24px,env(safe-area-inset-top))]">
        {capaUrl ? (
          <img
            src={capaUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-25"
            decoding="async"
          />
        ) : null}
        <div className="relative mx-auto flex max-w-[520px] items-center gap-3">
          <LogoBarbearia nome={confirmacao.barbearia} url={logoUrl ?? null} size={56} />
          <div>
            <p className="text-sm font-semibold text-mute">Seu horário em</p>
            <p className="text-lg font-extrabold text-paper">{confirmacao.barbearia}</p>
          </div>
        </div>
      </header>
      <section className="mx-auto w-full max-w-[520px] px-5 pt-7">
        <span
          className={`mov-confirmacao flex size-14 items-center justify-center rounded-full ${ativo ? "bg-gold/15 text-gold" : "bg-brick/15 text-brick"}`}
        >
          {ativo ? <VistoAnimado tamanho={56} /> : <CalendarX size={28} aria-hidden />}
        </span>
        <h1 className="mt-5 text-2xl font-bold text-paper">{titulo}</h1>
        {ativo && textoFinal ? <p className="mt-2 text-sm text-mute">{textoFinal}</p> : null}
        {ativo ? (
          <div className="mt-6">
            <IngressoAgendamento
              negocio={confirmacao.barbearia}
              servico={confirmacao.servico}
              profissional={confirmacao.profissional}
              data={dataLocal(confirmacao.inicio, fuso)}
              horario={horaLocal(confirmacao.inicio, fuso)}
              valorCentavos={confirmacao.valor_centavos}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-mute">Escolha outro horário quando quiser.</p>
        )}
        {extras}
        {erro ? (
          <p className="mt-4 text-sm text-brick" role="alert">
            {erro}
          </p>
        ) : null}
        {ativo ? (
          <div className="mt-6 grid gap-2">
            <Button asChild variant="outline">
              <a href={linkGoogleAgenda(confirmacao)} target="_blank" rel="noopener noreferrer">
                <CalendarPlus />
                Google Agenda
              </a>
            </Button>
            <Button variant="outline" onClick={() => baixarArquivoIcs(confirmacao)}>
              <CalendarPlus />
              Baixar arquivo .ics
            </Button>
            {podeCompartilhar ? (
              <Button
                variant="outline"
                onClick={() => navigator.share({ title: "Meu horário", text: compartilhamento })}
              >
                <Share2 />
                Compartilhar horário
              </Button>
            ) : null}
            {confirmacao.whatsapp ? (
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/${confirmacao.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! ${compartilhamento}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle />
                  Enviar pelo WhatsApp
                </a>
              </Button>
            ) : null}
            <Button variant="outline" disabled={cancelando} onClick={onAlterar}>
              Alterar agendamento
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-brick" disabled={cancelando}>
                  Cancelar agendamento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar este horário?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O horário ficará disponível para outra pessoa.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Manter</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground"
                    onClick={onCancelar}
                  >
                    Cancelar horário
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" onClick={onNovo}>
              Fazer outro agendamento
            </Button>
          </div>
        ) : (
          <Button className="mt-6 w-full" onClick={onNovo}>
            Escolher outro horário
          </Button>
        )}
        {assinaturaVisivel ? (
          <a
            href="/apresentacao"
            target="_blank"
            rel="noopener"
            className="mx-auto mt-10 flex min-h-12 w-fit items-center px-3 text-xs font-semibold text-mute"
          >
            Agendado com Cortaí
          </a>
        ) : null}
      </section>
    </main>
  );
}
