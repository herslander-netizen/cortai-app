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
import { linkDoWhatsApp } from "@/lib/whatsapp/link-whatsapp";
import type { ConfirmacaoPublica } from "@/lib/agendamento-publico.functions";
import "./ConfirmacaoAgendamento.css";

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
    <main className="agendamento-confirmacao min-h-dvh" data-estado={situacao}>
      <header className="confirmacao-topo">
        {capaUrl ? (
          <img
            src={capaUrl}
            alt=""
            className="confirmacao-capa"
            decoding="async"
          />
        ) : null}
        <div className="confirmacao-topo-conteudo">
          <LogoBarbearia nome={confirmacao.barbearia} url={logoUrl ?? null} size={52} />
          <div className="confirmacao-negocio">
            <p className="confirmacao-negocio-rotulo">Seu horário em</p>
            <p className="confirmacao-negocio-nome">{confirmacao.barbearia}</p>
          </div>
        </div>
      </header>
      <section className="confirmacao-conteudo">
        <div className="confirmacao-hero">
        <span
          className={`mov-confirmacao confirmacao-visto ${ativo ? "bg-gold/15 text-gold" : "bg-brick/15 text-brick"}`}
        >
          {ativo ? <VistoAnimado tamanho={56} /> : <CalendarX size={28} aria-hidden />}
        </span>
        <h1 className="confirmacao-titulo">{titulo}</h1>
        {ativo && textoFinal ? <p className="mt-2 text-sm text-mute">{textoFinal}</p> : null}
        {ativo && confirmacao.endereco ? (
          <p className="confirmacao-endereco">
            <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
            {confirmacao.endereco}
          </p>
        ) : null}
        {ativo && confirmacao.mensagemDoNegocio ? (
          <p className="confirmacao-mensagem whitespace-pre-line">
            {confirmacao.mensagemDoNegocio}
          </p>
        ) : null}
        </div>
        {ativo ? (
          <div className="confirmacao-ingresso">
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
          <div className="confirmacao-acao-principal">
            <Button
              asChild
              size="lg"
              variant="primary"
              className="confirmacao-cta"
            >
              <a href={linkGoogleAgenda(confirmacao)} target="_blank" rel="noopener noreferrer">
                <CalendarPlus />
                Adicionar à agenda
              </a>
            </Button>
            {extras ? <div className="confirmacao-extras">{extras}</div> : null}
            <div className="confirmacao-secundarias">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="confirmacao-expandir">
                  Mais formas de guardar e enviar
                  <ChevronDown className="confirmacao-chevron" aria-hidden />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="confirmacao-opcoes">
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
                      href={
                        linkDoWhatsApp(confirmacao.whatsapp, `Olá! ${compartilhamento}`) ??
                        undefined
                      }
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
                <Button variant="outline" className="confirmacao-expandir">
                  Gerenciar agendamento
                  <ChevronDown className="confirmacao-chevron" aria-hidden />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="confirmacao-opcoes">
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
              </CollapsibleContent>
            </Collapsible>
            </div>
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
            className="confirmacao-assinatura"
          >
            Agendado com <strong>Flow</strong>
          </a>
        ) : null}
      </section>
    </main>
  );
}
