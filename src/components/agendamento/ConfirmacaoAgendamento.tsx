import { CalendarPlus, CalendarX, ChevronDown, MapPin, MessageCircle, Share2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { VistoAnimado } from "@/components/ui/VistoAnimado";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { baixarArquivoIcs, linkGoogleAgenda } from "@/lib/calendario-agendamento";
import type { ConfirmacaoPublica } from "@/lib/agendamento-publico.functions";

function dataLocal(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(iso));
}

function horaLocal(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export type SituacaoPublica =
  "confirmado" | "cancelado" | "cancelado_pela_barbearia" | "remarcado" | "nao_compareceu";

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
    confirmado: "Horário garantido",
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
    <main className="agendamento-confirmacao min-h-dvh pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="relative overflow-hidden px-5 pb-4 pt-[max(16px,env(safe-area-inset-top))]">
        {capaUrl ? (
          <img
            src={capaUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-25"
            decoding="async"
          />
        ) : null}
        <div className="relative mx-auto flex w-full max-w-[520px] items-center gap-3">
          <LogoBarbearia nome={confirmacao.barbearia} url={logoUrl ?? null} size={56} />
          <div>
            <p className="text-sm font-semibold text-mute">Seu horário em</p>
            <p className="text-lg font-extrabold text-paper">{confirmacao.barbearia}</p>
          </div>
        </div>
      </header>
      <section className="mx-auto w-full max-w-[520px] px-4 pt-4 sm:px-5 sm:pt-5">
        <span
          className={`mov-confirmacao flex size-14 items-center justify-center rounded-full ${ativo ? "bg-gold/15 text-gold" : "bg-brick/15 text-brick"}`}
        >
          {ativo ? <VistoAnimado tamanho={56} /> : <CalendarX size={28} aria-hidden />}
        </span>
        <h1 className="mt-3 text-2xl font-bold leading-tight text-paper sm:text-3xl">{titulo}</h1>
        {ativo && textoFinal ? <p className="mt-2 text-sm text-mute">{textoFinal}</p> : null}
        {ativo && confirmacao.endereco ? (
          <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-mute">
            <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
            {confirmacao.endereco}
          </p>
        ) : null}
        {ativo ? (
          <div className="mt-4">
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
        {erro ? (
          <p className="mt-4 text-sm text-brick" role="alert">
            {erro}
          </p>
        ) : null}
        {ativo ? (
          <div className="mt-4 grid gap-2 sm:gap-3">
            <Button asChild size="lg" variant="primary" className="min-h-12 rounded-full sm:min-h-14">
              <a href={linkGoogleAgenda(confirmacao)} target="_blank" rel="noopener noreferrer">
                <CalendarPlus />
                Adicionar à agenda
              </a>
            </Button>
            {extras}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="min-h-12 w-full justify-between">
                  Mais formas de guardar e enviar
                  <ChevronDown aria-hidden />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 grid gap-2">
                <Button variant="outline" onClick={() => baixarArquivoIcs(confirmacao)}>
                  <CalendarPlus />
                  Baixar arquivo .ics
                </Button>
                {podeCompartilhar ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigator.share({ title: "Meu horário", text: compartilhamento })
                    }
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
              </CollapsibleContent>
            </Collapsible>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="min-h-12 w-full justify-between">
                  Gerenciar agendamento
                  <ChevronDown aria-hidden />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 grid gap-2">
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
                      <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={onCancelar}>
                        Cancelar horário
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="ghost" onClick={onNovo}>
                  Fazer outro agendamento
                </Button>
              </CollapsibleContent>
            </Collapsible>
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
            className="mx-auto mt-6 flex min-h-12 w-fit items-center px-3 text-xs font-semibold text-mute sm:mt-10"
          >
            Agendado com Flow
          </a>
        ) : null}
      </section>
    </main>
  );
}
