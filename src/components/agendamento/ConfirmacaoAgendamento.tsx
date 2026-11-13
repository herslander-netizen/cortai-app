import { CalendarPlus, CalendarX, ChevronDown, MessageCircle, Share2, X } from "lucide-react";
import { useMemo } from "react";

import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
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
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VistoAnimado } from "@/components/ui/VistoAnimado";
import type { ConfirmacaoPublica } from "@/lib/agendamento-publico.functions";
import { baixarArquivoIcs, linkGoogleAgenda } from "@/lib/calendario-agendamento";
import { brl } from "@/lib/format";
import { linkDoWhatsApp } from "@/lib/whatsapp/link-whatsapp";
import "./ConfirmacaoAgendamento.css";

function dataLocal(iso: string, fuso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    weekday: "long",
    day: "numeric",
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
  | "confirmado"
  | "cancelado"
  | "cancelado_pela_barbearia"
  | "remarcado"
  | "nao_compareceu";

export type VisualDaConfirmacao = "direta" | "site" | "conversa" | "figaro";

export function ConfirmacaoAgendamento({
  confirmacao,
  situacao,
  fuso,
  logoUrl,
  assinaturaVisivel = true,
  textoFinal,
  cancelando,
  erro,
  avisos,
  extras,
  visual = "direta",
  onAlterar,
  onCancelar,
  onNovo,
  onFechar,
}: {
  confirmacao: ConfirmacaoPublica;
  situacao: SituacaoPublica;
  fuso: string;
  logoUrl?: string | null;
  assinaturaVisivel?: boolean;
  textoFinal?: string;
  cancelando?: boolean;
  erro?: string;
  /** Ativação de avisos, quando o cliente ainda precisa verificar o telefone. */
  avisos?: React.ReactNode;
  /** Preferências, comanda e convite: recursos opcionais atrás de um único painel. */
  extras?: React.ReactNode;
  visual?: VisualDaConfirmacao;
  onAlterar: () => void;
  onCancelar: () => void;
  onNovo: () => void;
  onFechar: () => void;
}) {
  const ativo = situacao === "confirmado";
  const podeCompartilhar =
    typeof navigator !== "undefined" && typeof navigator.share === "function";
  const tituloDoEstado = {
    confirmado: "Obrigado!",
    cancelado: "Agendamento cancelado",
    cancelado_pela_barbearia: "O negócio cancelou este horário",
    remarcado: "O negócio remarcou este horário",
    nao_compareceu: "Este horário foi marcado como falta",
  }[situacao];

  const inicio = horaLocal(confirmacao.inicio, fuso);
  const fim = horaLocal(confirmacao.fim, fuso);
  const dia = dataLocal(confirmacao.inicio, fuso);
  const compartilhamento = useMemo(
    () =>
      `${confirmacao.servico} com ${confirmacao.profissional}, ${dataLocal(confirmacao.inicio, fuso)} às ${horaLocal(confirmacao.inicio, fuso)}, em ${confirmacao.barbearia}.`,
    [confirmacao, fuso],
  );

  return (
    <main className="agendamento-confirmacao min-h-dvh" data-estado={situacao} data-visual={visual}>
      <div className="confirmacao-conteudo">
        <header className="confirmacao-topo">
          <p className="confirmacao-cabecalho">
            {ativo ? "Confirmado!" : "Seu agendamento"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar confirmação"
            className="confirmacao-fechar"
            onClick={onFechar}
          >
            <X size={21} aria-hidden />
          </Button>
        </header>

        <section className="confirmacao-hero" aria-labelledby="confirmacao-titulo">
          <span
            className={`mov-confirmacao confirmacao-visto ${ativo ? "confirmacao-visto-ok" : "confirmacao-visto-inativo"}`}
          >
            {ativo ? <VistoAnimado tamanho={56} /> : <CalendarX size={29} aria-hidden />}
          </span>
          <h1 id="confirmacao-titulo" className="confirmacao-titulo">
            {tituloDoEstado}
          </h1>
          {ativo ? (
            <p className="confirmacao-subtitulo">Seu horário está confirmado.</p>
          ) : (
            <p className="confirmacao-subtitulo">Você pode escolher outro horário quando quiser.</p>
          )}
        </section>

        {ativo ? (
          <>
            <section className="confirmacao-resumo" aria-label="Resumo do atendimento">
              <dl>
                <div className="confirmacao-linha">
                  <dt>Quando</dt>
                  <dd>
                    <strong>{dia}</strong>
                    <span>{inicio} – {fim}</span>
                  </dd>
                </div>
                <div className="confirmacao-linha">
                  <dt>Onde</dt>
                  <dd>
                    <span className="confirmacao-negocio">
                      {logoUrl ? (
                        <LogoBarbearia nome={confirmacao.barbearia} url={logoUrl} size={30} />
                      ) : null}
                      <strong>{confirmacao.barbearia}</strong>
                    </span>
                    {confirmacao.endereco ? <span>{confirmacao.endereco}</span> : null}
                  </dd>
                </div>
                <div className="confirmacao-linha">
                  <dt>Serviço</dt>
                  <dd>
                    <strong>{confirmacao.servico}</strong>
                    <span>com {confirmacao.profissional}</span>
                    <span>Valor: {brl(confirmacao.valor_centavos)}</span>
                  </dd>
                </div>
              </dl>
            </section>

            {confirmacao.mensagemDoNegocio ? (
              <p className="confirmacao-mensagem whitespace-pre-line">
                {confirmacao.mensagemDoNegocio}
              </p>
            ) : null}
            {textoFinal?.trim() && textoFinal.trim() !== "Obrigado!" ? (
              <p className="confirmacao-mensagem whitespace-pre-line">{textoFinal}</p>
            ) : null}

            {avisos ? <div className="confirmacao-avisos">{avisos}</div> : null}
            {erro ? <p className="confirmacao-erro" role="alert">{erro}</p> : null}

            <div className="confirmacao-acao-principal">
              <Button
                variant="primary"
                size="lg"
                className="confirmacao-cta"
                onClick={onFechar}
              >
                Fechar
              </Button>
            </div>

            <Collapsible className="confirmacao-secundarias">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="confirmacao-expandir">
                  Mais opções
                  <ChevronDown size={18} className="confirmacao-chevron" aria-hidden />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="confirmacao-opcoes">
                <Button variant="outline" asChild>
                  <a href={linkGoogleAgenda(confirmacao)} target="_blank" rel="noopener noreferrer">
                    <CalendarPlus size={18} aria-hidden /> Adicionar à agenda
                  </a>
                </Button>
                <Button variant="outline" onClick={() => baixarArquivoIcs(confirmacao)}>
                  <CalendarPlus size={18} aria-hidden /> Baixar arquivo .ics
                </Button>
                {podeCompartilhar ? (
                  <Button
                    variant="outline"
                    onClick={() => void navigator.share({ title: "Meu horário", text: compartilhamento }).catch(() => undefined)}
                  >
                    <Share2 size={18} aria-hidden /> Compartilhar horário
                  </Button>
                ) : null}
                {confirmacao.whatsapp ? (
                  <Button asChild variant="outline">
                    <a
                      href={linkDoWhatsApp(confirmacao.whatsapp, `Olá! ${compartilhamento}`) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={18} aria-hidden /> Enviar pelo WhatsApp
                    </a>
                  </Button>
                ) : null}
                <Button variant="outline" onClick={onAlterar} disabled={cancelando}>
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

            {extras ? (
              <Collapsible className="confirmacao-detalhes">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="confirmacao-expandir">
                    Detalhes e preferências
                    <ChevronDown size={18} className="confirmacao-chevron" aria-hidden />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="confirmacao-extras">
                  {extras}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </>
        ) : (
          <>
            {erro ? <p className="confirmacao-erro" role="alert">{erro}</p> : null}
            <Button className="confirmacao-cta confirmacao-novo" variant="primary" onClick={onNovo}>
              Escolher outro horário
            </Button>
          </>
        )}

        {assinaturaVisivel ? (
          <a
            href="/apresentacao"
            target="_blank"
            rel="noopener noreferrer"
            className="confirmacao-assinatura"
          >
            Agendado com <strong>Flow</strong>
          </a>
        ) : null}
      </div>
    </main>
  );
}
